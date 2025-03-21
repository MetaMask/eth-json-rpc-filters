const { PollingBlockTracker } = require('@metamask/eth-block-tracker');
const { providerAsMiddleware } = require('@metamask/eth-json-rpc-middleware');
const { providerFromEngine } = require('@metamask/eth-json-rpc-provider');
const { JsonRpcEngine } = require('@metamask/json-rpc-engine');
const EventEmitter = require('events');
const Ganache = require('ganache');

const createFilterMiddleware = require('..');
const createSubscriptionMiddleware = require('../subscriptionManager');

module.exports = {
  createPayload,
  createEngineFromGanache,
  createTestSetup,
  asyncTest,
  timeout,
  deployLogEchoContract,
};

/**
 * Creates a test setup with a Ganache provider, block tracker, and JSON-RPC engine.
 *
 * @returns {object} The test setup including the engine, provider, request function, and other utilities.
 */
function createTestSetup() {
  // raw data source
  const { ganacheProvider, forceNextBlock } = createEngineFromGanache();
  // create block tracker
  const blockTracker = new PollingBlockTracker({
    provider: ganacheProvider,
    pollingInterval: 200,
  });
  // create higher level
  const engine = new JsonRpcEngine();
  const provider = providerFromEngine(engine);
  const request = provider.request.bind(provider);
  // add filter middleware
  engine.push(createFilterMiddleware({ blockTracker, provider }));
  // add subscription middleware
  const subscriptionManager = createSubscriptionMiddleware({
    blockTracker,
    provider,
  });
  engine.push(subscriptionManager.middleware);
  subscriptionManager.events.on('notification', (message) =>
    engine.emit('notification', message),
  );
  // add data source
  engine.push(providerAsMiddleware(ganacheProvider));

  // subs helper
  const subs = createSubsHelper({ provider });

  return {
    ganacheProvider,
    forceNextBlock,
    engine,
    provider,
    request,
    subs,
    blockTracker,
    trackNextBlock,
  };

  /**
   * Tracks the next block.
   *
   * @returns {Promise<void>} A promise that resolves when the next block is tracked.
   */
  async function trackNextBlock() {
    return new Promise((resolve) => blockTracker.once('latest', resolve));
  }
}

/**
 * Creates a subscriptions helper.
 *
 * @param {object} args - The options object.
 * @param {object} args.provider - The provider to use.
 * @returns {object} The subscriptions helper.
 */
function createSubsHelper({ provider }) {
  return {
    logs: createSubGenerator({ subType: 'logs', provider }),
    newPendingTransactions: createSubGenerator({
      subType: 'newPendingTransactions',
      provider,
    }),
    newHeads: createSubGenerator({ subType: 'newHeads', provider }),
  };
}

/**
 * Creates a subscription generator.
 *
 * @param {object} args - The options object.
 * @param {string} args.subType - The subscription type.
 * @param {object} args.provider - The provider to use.
 * @returns {Function} The subscription generator function.
 */
function createSubGenerator({ subType, provider }) {
  return async function (...args) {
    const id = await provider.request({
      method: 'eth_subscribe',
      params: [subType, ...args],
    });
    return createNewSub({ id, provider });
  };
}

/**
 * Creates a new subscription.
 *
 * @param {object} args - The options object.
 * @param {string} args.id - The subscription ID.
 * @param {object} args.provider - The provider to use.
 * @returns {object} The created subscription.
 */
function createNewSub({ id, provider }) {
  // event emitter for emitting subscription hits
  const events = new EventEmitter();
  // filter rpc notifications for matching subscription
  provider.on('data', (_, message) => {
    if (message.method !== 'eth_subscription') {
      return;
    }
    const subId = message.params.subscription;
    if (subId !== id) {
      return;
    }
    const value = message.params.result;
    events.emit('notification', value);
  });
  // subscription uninstall method
  /**
   * Uninstalls the subscription.
   *
   * @returns {Promise<void>} A promise that resolves when the subscription is uninstalled.
   */
  async function uninstall() {
    return await provider.request({ method: 'eth_unsubscribe', params: [id] });
  }
  // return custom "subscription" api object
  return {
    id,
    events,
    uninstall,
  };
}

/**
 * Creates an engine from a Ganache provider.
 *
 * @returns {object} The Ganache provider and a function to force the next block.
 */
function createEngineFromGanache() {
  const ganacheProvider = Ganache.provider();
  return { ganacheProvider, forceNextBlock };

  /**
   * Forces the next block to be mined.
   *
   * @returns {Promise<void>} A promise that resolves when the next block is mined.
   */
  async function forceNextBlock() {
    // custom ganache method
    await ganacheProvider.request(createPayload({ method: 'evm_mine' }));
  }
}

/**
 * Creates a JSON-RPC payload.
 *
 * @param {object} payload - The payload object.
 * @returns {object} The created payload.
 */
function createPayload(payload) {
  return Object.assign({ id: 1, jsonrpc: '2.0', params: [] }, payload);
}

/**
 * Wraps an asynchronous test function for use with a test runner.
 *
 * @param {Function} asyncTestFn - The asynchronous test function.
 * @returns {Function} The wrapped test function.
 */
function asyncTest(asyncTestFn) {
  return async function (t) {
    try {
      await asyncTestFn(t);
      t.end();
    } catch (error) {
      t.end(error);
    }
  };
}

/**
 * Creates a promise that resolves after a specified duration.
 *
 * @param {number} duration - The duration in milliseconds.
 * @returns {Promise<void>} A promise that resolves after the specified duration.
 */
function timeout(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

/**
 * Deploys a log echo contract.
 *
 * @param {object} args - The options object.
 * @param {object} args.tools - The tools to use.
 * @param {string} args.from - The address to deploy the contract from.
 * @returns {Promise<object>} The deployment transaction hash, receipt, and contract address.
 */
async function deployLogEchoContract({ tools, from }) {
  // https://github.com/kumavis/eth-needlepoint/blob/master/examples/emit-log.js
  const { request } = tools;
  const deployTxHash = await request({
    method: 'eth_sendTransaction',
    params: [
      {
        from,
        data: '0x600e600c600039600e6000f336600060003760005160206000a1',
      },
    ],
  });

  await tools.trackNextBlock();
  const deployTxRx = await request({
    method: 'eth_getTransactionReceipt',
    params: [deployTxHash],
  });
  const { contractAddress } = deployTxRx;
  return {
    deployTxHash,
    deployTxRx,
    contractAddress,
  };
}
