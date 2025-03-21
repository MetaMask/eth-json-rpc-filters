const {
  createAsyncMiddleware,
  createScaffoldMiddleware,
} = require('@metamask/json-rpc-engine');
const { Mutex } = require('async-mutex');

const BlockFilter = require('./block-filter');
const { intToHex, hexToInt } = require('./hexUtils');
const LogFilter = require('./log-filter');
const TxFilter = require('./tx-filter');

module.exports = createEthFilterMiddleware;

/**
 * Creates an Ethereum filter middleware.
 *
 * @param {object} args - The options object.
 * @param {object} args.blockTracker - The block tracker to use.
 * @param {object} args.provider - The provider to use.
 * @returns {object} The created middleware.
 */
function createEthFilterMiddleware({ blockTracker, provider }) {
  // create filter collection
  let filterIndex = 0;
  let filters = {};
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
  });

  // setup filter updating and destroy handler
  const filterUpdater = async ({ oldBlock, newBlock }) => {
    if (filters.length === 0) {
      return;
    }
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

  /**
   * Creates a new log filter.
   *
   * @param {object} params - The parameters for the log filter.
   * @returns {Promise<object>} The created log filter.
   */
  async function newLogFilter(params) {
    const filter = new LogFilter({ provider, params });
    await installFilter(filter);
    return filter;
  }

  /**
   * Creates a new block filter.
   *
   * @returns {Promise<object>} The created block filter.
   */
  async function newBlockFilter() {
    const filter = new BlockFilter({ provider });
    await installFilter(filter);
    return filter;
  }

  /**
   * Creates a new pending transaction filter.
   *
   * @returns {Promise<object>} The created pending transaction filter.
   */
  async function newPendingTransactionFilter() {
    const filter = new TxFilter({ provider });
    await installFilter(filter);
    return filter;
  }

  //
  // get filter changes
  //

  /**
   * Gets the changes for a filter.
   *
   * @param {string} filterIndexHex - The hexadecimal index of the filter.
   * @returns {Promise<Array>} The filter changes.
   */
  async function getFilterChanges(filterIndexHex) {
    const filterIndex_ = hexToInt(filterIndexHex);
    const filter = filters[filterIndex_];
    if (!filter) {
      throw new Error(`No filter for index "${filterIndex_}"`);
    }
    const results = filter.getChangesAndClear();
    return results;
  }

  /**
   * Gets the logs for a filter.
   *
   * @param {string} filterIndexHex - The hexadecimal index of the filter.
   * @returns {Promise<Array>} The filter logs.
   */
  async function getFilterLogs(filterIndexHex) {
    const filterIndex_ = hexToInt(filterIndexHex);
    const filter = filters[filterIndex_];
    if (!filter) {
      throw new Error(`No filter for index "${filterIndex_}"`);
    }
    // only return results for log filters
    let results = [];
    if (filter.type === 'log') {
      results = filter.getAllResults();
    }
    return results;
  }

  //
  // remove filters
  //

  /**
   * Uninstalls a filter.
   *
   * @param {string} filterIndexHex - The hexadecimal index of the filter.
   * @returns {Promise<boolean>} True if the filter was uninstalled, false otherwise.
   */
  async function uninstallFilterHandler(filterIndexHex) {
    // check filter exists
    const filterIndex_ = hexToInt(filterIndexHex);
    const filter = filters[filterIndex_];
    const result = Boolean(filter);
    // uninstall filter
    if (result) {
      await uninstallFilter(filterIndex_);
    }
    return result;
  }

  //
  // utils
  //

  /**
   * Installs a filter.
   *
   * @param {object} filter - The filter to install.
   * @returns {Promise<number>} The index of the installed filter.
   */
  async function installFilter(filter) {
    const prevFilterCount = Object.values(filters).length;
    // install filter
    const currentBlock = await blockTracker.getLatestBlock();
    await filter.initialize({ currentBlock });
    filterIndex += 1;
    // TODO: Address this later
    // eslint-disable-next-line require-atomic-updates
    filters[filterIndex] = filter;
    filter.id = filterIndex;
    filter.idHex = intToHex(filterIndex);
    // update block tracker subs
    const newFilterCount = Object.values(filters).length;
    updateBlockTrackerSubs({ prevFilterCount, newFilterCount });
    return filterIndex;
  }

  /**
   * Uninstalls a filter.
   *
   * @param {number} filterIndex_ - The index of the filter to uninstall.
   * @returns {Promise<void>}
   */
  async function uninstallFilter(filterIndex_) {
    const prevFilterCount = Object.values(filters).length;
    delete filters[filterIndex_];
    // update block tracker subs
    const newFilterCount = Object.values(filters).length;
    updateBlockTrackerSubs({ prevFilterCount, newFilterCount });
  }

  /**
   * Uninstalls all filters.
   *
   * @returns {Promise<void>}
   */
  async function uninstallAllFilters() {
    const prevFilterCount = Object.values(filters).length;
    filters = {};
    // update block tracker subs
    updateBlockTrackerSubs({ prevFilterCount, newFilterCount: 0 });
  }

  /**
   * Updates the block tracker subscriptions.
   *
   * @param {object} args - The options object.
   * @param {number} args.prevFilterCount - The previous filter count.
   * @param {number} args.newFilterCount - The new filter count.
   */
  function updateBlockTrackerSubs({ prevFilterCount, newFilterCount }) {
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

// helper for turning filter constructors into rpc middleware
/**
 * Converts a filter creation function into RPC middleware.
 *
 * @param {Function} createFilterFn - The filter creation function.
 * @returns {Function} The RPC middleware.
 */
function toFilterCreationMiddleware(createFilterFn) {
  return toAsyncRpcMiddleware(async (...args) => {
    const filter = await createFilterFn(...args);
    const result = intToHex(filter.id);
    return result;
  });
}

// helper for pulling out req.params and setting res.result
/**
 * Converts an asynchronous function into RPC middleware.
 *
 * @param {Function} asyncFn - The asynchronous function.
 * @returns {Function} The RPC middleware.
 */
function toAsyncRpcMiddleware(asyncFn) {
  return createAsyncMiddleware(async (req, res) => {
    const result = Array.isArray(req.params)
      ? await asyncFn(...req.params)
      : await asyncFn(req.params);
    res.result = result;
  });
}

/**
 * Wraps middleware with a mutex to ensure exclusive access.
 *
 * @param {object} args - The options object.
 * @param {object} args.mutex - The mutex to use.
 * @returns {Function} The wrapped middleware.
 */
function mutexMiddlewareWrapper({ mutex }) {
  return (middleware) => {
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
