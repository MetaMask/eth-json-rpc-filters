import type { BlockTracker } from '@metamask/eth-block-tracker';
import type { InternalProvider } from '@metamask/eth-json-rpc-provider';
import {
  createAsyncMiddleware,
  createScaffoldMiddleware,
} from '@metamask/json-rpc-engine';
import type { JsonRpcMiddleware } from '@metamask/json-rpc-engine';
import type { Json, JsonRpcParams } from '@metamask/utils';
import { Mutex } from 'async-mutex';

import type { BaseFilter, FilterUpdate } from './base-filter.js';
import { BlockFilter } from './block-filter.js';
import { hexToInt, intToHex } from './hexUtils.js';
import { LogFilter } from './log-filter.js';
import type { LogFilterParams } from './log-filter.js';
import { TxFilter } from './tx-filter.js';

export type { Block } from './getBlocksForRange.js';
export type { Log, LogFilterParams } from './log-filter.js';

export type EthFilterMiddleware = JsonRpcMiddleware<JsonRpcParams, Json> & {
  newLogFilter: (params?: LogFilterParams) => Promise<LogFilter>;
  newBlockFilter: () => Promise<BlockFilter>;
  newPendingTransactionFilter: () => Promise<TxFilter>;
  uninstallFilter: (filterIndexHex: string) => Promise<boolean>;
  getFilterChanges: (filterIndexHex: string) => Promise<unknown[]>;
  getFilterLogs: (filterIndexHex: string) => Promise<unknown[]>;
  destroy: () => void;
};

type AnyFilter = BaseFilter;

/**
 * Create the middleware implementing the `eth_newFilter`,
 * `eth_newBlockFilter`, `eth_newPendingTransactionFilter`,
 * `eth_uninstallFilter`, `eth_getFilterChanges` and `eth_getFilterLogs`
 * methods.
 *
 * @param options - Options.
 * @param options.blockTracker - The block tracker used to keep filters up to
 * date.
 * @param options.provider - The provider used to query the chain.
 * @returns The middleware, which also exposes the filter methods directly.
 */
export function createEthFilterMiddleware({
  blockTracker,
  provider,
}: {
  blockTracker: BlockTracker;
  provider: InternalProvider;
}): EthFilterMiddleware {
  // create filter collection
  let filterIndex = 0;
  let filters: Record<number, AnyFilter> = {};
  // create update mutex
  const mutex = new Mutex();
  const waitForFree = mutexMiddlewareWrapper({ mutex });

  const middleware = createScaffoldMiddleware({
    // install filters
    eth_newFilter: waitForFree(toFilterCreationMiddleware(newLogFilter)),
    eth_newBlockFilter: waitForFree(toFilterCreationMiddleware(newBlockFilter)),
    eth_newPendingTransactionFilter: waitForFree(
      toFilterCreationMiddleware(newPendingTransactionFilter),
    ),
    // uninstall filters
    eth_uninstallFilter: waitForFree(
      toAsyncRpcMiddleware(uninstallFilterHandler),
    ),
    // checking filter changes
    eth_getFilterChanges: waitForFree(toAsyncRpcMiddleware(getFilterChanges)),
    eth_getFilterLogs: waitForFree(toAsyncRpcMiddleware(getFilterLogs)),
  }) as EthFilterMiddleware;

  // setup filter updating and destroy handler
  const filterUpdater = async ({ oldBlock, newBlock }: FilterUpdate) => {
    // lock update reads
    const releaseLock = await mutex.acquire();
    try {
      // process all filters in parallel
      await Promise.all(
        Object.values(filters).map(async (filter) => {
          try {
            await filter.update({ oldBlock, newBlock });
          } catch (error) {
            // handle each error individually so filter update errors don't affect other filters
            console.error(error);
          }
        }),
      );
    } catch (error) {
      // log error so we don't skip the releaseLock
      console.error(error);
    }
    // unlock update reads
    releaseLock();
  };

  // expose filter methods directly
  middleware.newLogFilter = newLogFilter;
  middleware.newBlockFilter = newBlockFilter;
  middleware.newPendingTransactionFilter = newPendingTransactionFilter;
  middleware.uninstallFilter = uninstallFilterHandler;
  middleware.getFilterChanges = getFilterChanges;
  middleware.getFilterLogs = getFilterLogs;

  // expose destroy method for cleanup
  middleware.destroy = () => {
    uninstallAllFilters();
  };

  return middleware;

  //
  // new filters
  //

  async function newLogFilter(params?: LogFilterParams): Promise<LogFilter> {
    const filter = new LogFilter({ provider, params });
    await installFilter(filter);
    return filter;
  }

  async function newBlockFilter(): Promise<BlockFilter> {
    const filter = new BlockFilter({ provider });
    await installFilter(filter);
    return filter;
  }

  async function newPendingTransactionFilter(): Promise<TxFilter> {
    const filter = new TxFilter({ provider });
    await installFilter(filter);
    return filter;
  }

  //
  // get filter changes
  //

  async function getFilterChanges(filterIndexHex: string): Promise<unknown[]> {
    const index = hexToInt(filterIndexHex);
    const filter = filters[index];
    if (!filter) {
      throw new Error(`No filter for index "${index}"`);
    }
    return filter.getChangesAndClear();
  }

  async function getFilterLogs(filterIndexHex: string): Promise<unknown[]> {
    const index = hexToInt(filterIndexHex);
    const filter = filters[index];
    if (!filter) {
      throw new Error(`No filter for index "${index}"`);
    }
    // only return results for log filters
    if (filter instanceof LogFilter) {
      return filter.getAllResults();
    }
    return [];
  }

  //
  // remove filters
  //

  async function uninstallFilterHandler(
    filterIndexHex: string,
  ): Promise<boolean> {
    // check filter exists
    const index = hexToInt(filterIndexHex);
    const filter = filters[index];
    const result = Boolean(filter);
    // uninstall filter
    if (result) {
      await uninstallFilter(index);
    }
    return result;
  }

  //
  // utils
  //

  async function installFilter(filter: AnyFilter): Promise<number> {
    const prevFilterCount = Object.keys(filters).length;
    // install filter
    const currentBlock = await blockTracker.getLatestBlock();
    await filter.initialize({ currentBlock });
    filterIndex += 1;
    filters[filterIndex] = filter;
    filter.id = filterIndex;
    filter.idHex = intToHex(filterIndex);
    // update block tracker subs
    const newFilterCount = Object.keys(filters).length;
    updateBlockTrackerSubs({ prevFilterCount, newFilterCount });
    return filterIndex;
  }

  async function uninstallFilter(index: number): Promise<void> {
    const prevFilterCount = Object.keys(filters).length;
    delete filters[index];
    // update block tracker subs
    const newFilterCount = Object.keys(filters).length;
    updateBlockTrackerSubs({ prevFilterCount, newFilterCount });
  }

  async function uninstallAllFilters(): Promise<void> {
    const prevFilterCount = Object.keys(filters).length;
    filters = {};
    // update block tracker subs
    updateBlockTrackerSubs({ prevFilterCount, newFilterCount: 0 });
  }

  function updateBlockTrackerSubs({
    prevFilterCount,
    newFilterCount,
  }: {
    prevFilterCount: number;
    newFilterCount: number;
  }): void {
    // subscribe
    if (prevFilterCount === 0 && newFilterCount > 0) {
      blockTracker.on('sync', filterUpdater);
      return;
    }
    // unsubscribe
    if (prevFilterCount > 0 && newFilterCount === 0) {
      blockTracker.removeListener('sync', filterUpdater);
    }
  }
}

export default createEthFilterMiddleware;

// helper for turning filter constructors into rpc middleware
function toFilterCreationMiddleware<Params extends unknown[]>(
  createFilterFn: (...args: Params) => Promise<AnyFilter>,
): JsonRpcMiddleware<JsonRpcParams, Json> {
  return toAsyncRpcMiddleware(async (...args: Params) => {
    const filter = await createFilterFn(...args);
    return intToHex(filter.id as number);
  });
}

// helper for pulling out req.params and setting res.result
function toAsyncRpcMiddleware<Params extends unknown[]>(
  asyncFn: (...args: Params) => Promise<unknown>,
): JsonRpcMiddleware<JsonRpcParams, Json> {
  return createAsyncMiddleware(async (req, res) => {
    // `apply` is used (rather than a spread) so that object params, which
    // some callers pass, are treated as an empty argument list.
    // eslint-disable-next-line prefer-spread
    const result = await asyncFn.apply(null, req.params as unknown as Params);
    res.result = result as Json;
  });
}

function mutexMiddlewareWrapper({ mutex }: { mutex: Mutex }) {
  return (
    middleware: JsonRpcMiddleware<JsonRpcParams, Json>,
  ): JsonRpcMiddleware<JsonRpcParams, Json> => {
    return async (req, res, next, end) => {
      // wait for mutex available
      // we can release immediately because
      // we just need to make sure updates aren't active
      const releaseLock = await mutex.acquire();
      releaseLock();
      middleware(req, res, next, end);
    };
  };
}
