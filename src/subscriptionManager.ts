import type { BlockTracker } from '@metamask/eth-block-tracker';
import type { InternalProvider } from '@metamask/eth-json-rpc-provider';
import {
  createAsyncMiddleware,
  createScaffoldMiddleware,
} from '@metamask/json-rpc-engine';
import type { JsonRpcMiddleware } from '@metamask/json-rpc-engine';
import SafeEventEmitter from '@metamask/safe-event-emitter';
import type { Json, JsonRpcParams } from '@metamask/utils';

import type { BaseFilter, FilterUpdate } from './base-filter.js';
import { getBlocksForRange } from './getBlocksForRange.js';
import type { Block } from './getBlocksForRange.js';
import { incrementHexInt, unsafeRandomBytes } from './hexUtils.js';
import { createEthFilterMiddleware } from './index.js';
import type { LogFilterParams } from './log-filter.js';

// The request and response types are taken from the engine, since the engine
// may depend on a different version of `@metamask/utils`.
type AsyncMiddlewareHandler = Parameters<typeof createAsyncMiddleware>[0];
type Request = Parameters<AsyncMiddlewareHandler>[0];
type Response = Parameters<AsyncMiddlewareHandler>[1];

type Subscription = {
  type: string;
  destroy: () => Promise<unknown>;
  update?: (update: FilterUpdate) => Promise<void>;
};

export type SubscriptionMiddleware = JsonRpcMiddleware<JsonRpcParams, Json> & {
  destroy: () => void;
};

/**
 * Create the middleware implementing `eth_subscribe` and `eth_unsubscribe`.
 *
 * @param options - Options.
 * @param options.blockTracker - The block tracker used to keep subscriptions
 * up to date.
 * @param options.provider - The provider used to query the chain.
 * @returns The middleware, and an event emitter that emits a `notification`
 * event for each subscription result.
 */
export function createSubscriptionMiddleware({
  blockTracker,
  provider,
}: {
  blockTracker: BlockTracker;
  provider: InternalProvider;
}): { events: SafeEventEmitter; middleware: SubscriptionMiddleware } {
  // state and utilities for handling subscriptions
  const subscriptions: Record<string, Subscription> = {};
  const filterManager = createEthFilterMiddleware({ blockTracker, provider });

  // internal flag
  let isDestroyed = false;

  // create subscriptionManager api object
  const events = new SafeEventEmitter();
  const middleware = createScaffoldMiddleware({
    eth_subscribe: createAsyncMiddleware(subscribe),
    eth_unsubscribe: createAsyncMiddleware(unsubscribe),
  }) as SubscriptionMiddleware;
  middleware.destroy = destroy;
  return { events, middleware };

  async function subscribe(
    req: Request,
    res: Response,
  ): Promise<void> {
    if (isDestroyed) {
      throw new Error('SubscriptionManager - attempting to use after destroying');
    }

    const [subscriptionType, filterParams] = req.params as unknown as [string, LogFilterParams?];
    // subId is 16 byte hex string
    const subId = unsafeRandomBytes(16);

    // create sub
    let sub: Subscription;
    switch (subscriptionType) {
      case 'newHeads':
        sub = createSubNewHeads({ subId });
        break;
      case 'logs': {
        const filter = await filterManager.newLogFilter(filterParams);
        sub = createSubFromFilter({ subId, filter });
        break;
      }
      default:
        throw new Error(
          `SubscriptionManager - unsupported subscription type "${subscriptionType}"`,
        );
    }
    subscriptions[subId] = sub;

    res.result = subId;

    function createSubNewHeads({ subId: id }: { subId: string }): Subscription {
      const newHeadsSub: Subscription = {
        type: subscriptionType,
        destroy: async () => {
          blockTracker.removeListener('sync', update);
        },
        update,
      };

      async function update({ oldBlock, newBlock }: FilterUpdate) {
        // for newHeads
        const toBlock = newBlock;
        const fromBlock = incrementHexInt(oldBlock);
        const rawBlocks = await getBlocksForRange({
          provider,
          fromBlock,
          toBlock,
        });
        const results = rawBlocks
          .map(normalizeBlock)
          .filter((block) => block !== null);
        results.forEach((value) => {
          _emitSubscriptionResult(id, value);
        });
      }

      // check for subscription updates on new block
      blockTracker.on('sync', update);
      return newHeadsSub;
    }

    function createSubFromFilter({
      subId: id,
      filter,
    }: {
      subId: string;
      filter: BaseFilter;
    }): Subscription {
      filter.on('update', (result) => _emitSubscriptionResult(id, result));
      return {
        type: subscriptionType,
        destroy: async () => {
          return await filterManager.uninstallFilter(filter.idHex as string);
        },
      };
    }
  }

  async function unsubscribe(
    req: Request,
    res: Response,
  ): Promise<void> {
    if (isDestroyed) {
      throw new Error('SubscriptionManager - attempting to use after destroying');
    }

    const [id] = req.params as [string];
    const subscription = subscriptions[id];
    // if missing, return "false" to indicate it was not removed
    if (!subscription) {
      res.result = false;
      return;
    }
    // cleanup subscription
    delete subscriptions[id];
    await subscription.destroy();
    res.result = true;
  }

  function _emitSubscriptionResult(filterIdHex: string, value: unknown): void {
    events.emit('notification', {
      jsonrpc: '2.0',
      method: 'eth_subscription',
      params: {
        subscription: filterIdHex,
        result: value,
      },
    });
  }

  function destroy(): void {
    events.removeAllListeners();
    for (const id of Object.keys(subscriptions)) {
      subscriptions[id]?.destroy();
      delete subscriptions[id];
    }
    isDestroyed = true;
  }
}

export default createSubscriptionMiddleware;

function normalizeBlock(block: Block | null | undefined) {
  if (block === null || block === undefined) {
    return null;
  }
  return {
    hash: block.hash,
    parentHash: block.parentHash,
    sha3Uncles: block.sha3Uncles,
    miner: block.miner,
    stateRoot: block.stateRoot,
    transactionsRoot: block.transactionsRoot,
    receiptsRoot: block.receiptsRoot,
    logsBloom: block.logsBloom,
    difficulty: block.difficulty,
    number: block.number,
    gasLimit: block.gasLimit,
    gasUsed: block.gasUsed,
    nonce: block.nonce,
    mixHash: block.mixHash,
    timestamp: block.timestamp,
    extraData: block.extraData,
  };
}
