const {
  createAsyncMiddleware,
  createScaffoldMiddleware,
} = require('@metamask/json-rpc-engine');
const SafeEventEmitter = require('@metamask/safe-event-emitter').default;

const createFilterMiddleware = require('.');
const getBlocksForRange = require('./getBlocksForRange');
const { unsafeRandomBytes, incrementHexInt } = require('./hexUtils');

module.exports = createSubscriptionMiddleware;

/**
 * Creates a subscription middleware.
 *
 * @param {object} args - The options object.
 * @param {object} args.blockTracker - The block tracker to use.
 * @param {object} args.provider - The provider to use.
 * @returns {object} The created middleware and events emitter.
 */
function createSubscriptionMiddleware({ blockTracker, provider }) {
  // state and utilities for handling subscriptions
  const subscriptions = {};
  const filterManager = createFilterMiddleware({ blockTracker, provider });

  // internal flag
  let isDestroyed = false;

  // create subscriptionManager api object
  const events = new SafeEventEmitter();
  const middleware = createScaffoldMiddleware({
    eth_subscribe: createAsyncMiddleware(subscribe),
    eth_unsubscribe: createAsyncMiddleware(unsubscribe),
  });
  middleware.destroy = destroy;
  return { events, middleware };

  /**
   * Handles subscription requests.
   *
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  async function subscribe(req, res) {
    if (isDestroyed) {
      throw new Error(
        'SubscriptionManager - attempting to use after destroying',
      );
    }

    const subscriptionType = req.params[0];
    // subId is 16 byte hex string
    const subId = unsafeRandomBytes(16);

    // create sub
    let sub;
    switch (subscriptionType) {
      case 'newHeads':
        sub = createSubNewHeads({ subId });
        break;
      case 'logs':
        {
          const filterParams = req.params[1];
          const filter = await filterManager.newLogFilter(filterParams);
          sub = createSubFromFilter({ subId, filter });
        }
        break;
      default:
        throw new Error(
          `SubscriptionManager - unsupported subscription type "${subscriptionType}"`,
        );
    }
    subscriptions[subId] = sub;

    res.result = subId;

    /**
     * Creates a new heads subscription.
     *
     * @param {object} args - The options object.
     * @param {string} args.subId - The subscription ID.
     * @returns {object} The created subscription.
     */
    function createSubNewHeads({ subId: subId_ }) {
      const sub_ = {
        type: subscriptionType,
        destroy: async () => {
          blockTracker.removeListener('sync', sub.update);
        },
        update: async ({ oldBlock, newBlock }) => {
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
            _emitSubscriptionResult(subId_, value);
          });
        },
      };
      // check for subscription updates on new block
      blockTracker.on('sync', sub_.update);
      return sub_;
    }

    /**
     * Creates a subscription from a filter.
     *
     * @param {object} args - The options object.
     * @param {string} args.subId - The subscription ID.
     * @param {object} args.filter - The filter to use.
     * @returns {object} The created subscription.
     */
    function createSubFromFilter({ subId: subId_, filter }) {
      filter.on('update', (result) => _emitSubscriptionResult(subId_, result));
      return {
        type: subscriptionType,
        destroy: async () => {
          return await filterManager.uninstallFilter(filter.idHex);
        },
      };
    }
  }

  /**
   * Handles unsubscription requests.
   *
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  async function unsubscribe(req, res) {
    if (isDestroyed) {
      throw new Error(
        'SubscriptionManager - attempting to use after destroying',
      );
    }

    const id = req.params[0];
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

  /**
   * Emits a subscription result.
   *
   * @param {string} filterIdHex - The filter ID in hexadecimal.
   * @param {object} value - The result value.
   */
  function _emitSubscriptionResult(filterIdHex, value) {
    events.emit('notification', {
      jsonrpc: '2.0',
      method: 'eth_subscription',
      params: {
        subscription: filterIdHex,
        result: value,
      },
    });
  }

  /**
   * Destroys the subscription manager.
   */
  function destroy() {
    events.removeAllListeners();
    for (const id of Object.keys(subscriptions)) {
      subscriptions[id].destroy();
      delete subscriptions[id];
    }
    isDestroyed = true;
  }
}

/**
 * Normalizes a block object.
 *
 * @param {object} block - The block object to normalize.
 * @returns {object|null} The normalized block object or null if the block is invalid.
 */
function normalizeBlock(block) {
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
