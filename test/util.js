const EventEmitter = require('events')
const { PollingBlockTracker } = require('@metamask/eth-block-tracker')
const { JsonRpcEngineV2 } = require('@metamask/json-rpc-engine/v2')
const { providerAsMiddlewareV2 } = require('@metamask/eth-json-rpc-middleware')
const { InternalProvider } = require('@metamask/eth-json-rpc-provider')
const Ganache = require('ganache')
const createFilterMiddleware = require('../index.js')
const createSubscriptionMiddleware = require('../subscriptionManager.js')

module.exports = {
  createPayload,
  createEngineFromGanache,
  createEngineFromTestBlockMiddleware,
  createTestSetup,
  asyncTest,
  timeout,
  deployLogEchoContract,
}

function createTestSetup() {
  // raw data source
  const { ganacheProvider, forceNextBlock } = createEngineFromGanache()
  // create block tracker
  const blockTracker = new PollingBlockTracker({
    provider: ganacheProvider,
    pollingInterval: 200,
  })

  // create filter and subscription middleware
  // these use ganacheProvider directly for data queries
  const filterMiddleware = createFilterMiddleware({ blockTracker, provider: ganacheProvider })
  const subscriptionManager = createSubscriptionMiddleware({ blockTracker, provider: ganacheProvider })

  // create engine with all middleware
  const engine = JsonRpcEngineV2.create({
    middleware: [
      filterMiddleware,
      subscriptionManager.middleware,
      providerAsMiddlewareV2(ganacheProvider),
    ]
  })

  // create provider from engine with event support
  const internalProvider = new InternalProvider({ engine })
  const provider = Object.assign(new EventEmitter(), {
    request: internalProvider.request.bind(internalProvider)
  })

  // forward subscription notifications
  subscriptionManager.events.on('notification', (message) => {
    provider.emit('notification', message)
    provider.emit('data', null, message)
  })

  // subs helper
  const subs = createSubsHelper({ provider })

  return { ganacheProvider, forceNextBlock, provider, request: provider.request, subs, blockTracker, trackNextBlock }

  async function trackNextBlock() {
    return new Promise((resolve) => blockTracker.once('latest', resolve))
  }
}

function createSubsHelper({ provider }) {
  return {
    logs: createSubGenerator({ subType: 'logs', provider }),
    newPendingTransactions: createSubGenerator({ subType: 'newPendingTransactions', provider }),
    newHeads: createSubGenerator({ subType: 'newHeads', provider }),
  }
}

function createSubGenerator({ subType, provider }) {
  return async function () {
    const args = [].slice.call(arguments);
    args.unshift(subType);
    const id = await provider.request({
      method: "eth_subscribe",
      params: args,
    });
    return createNewSub({ id, provider });
  };
}

function createNewSub({ id, provider }) {
  // event emitter for emiting subscription hits
  const events = new EventEmitter()
  // filter rpc notifications for matching subscription
  provider.on('data', (_, message) => {
    if (message.method !== 'eth_subscription') return
    const subId = message.params.subscription
    if (subId !== id) return
    const value = message.params.result
    events.emit('notification', value)
  })
  // subscription uninstall method
  async function uninstall() {
    return await provider.request({ method: 'eth_unsubscribe', params: [id] });
  }
  // return custom "subscription" api object
  return {
    id,
    events,
    uninstall,
  }
}

function createEngineFromGanache () {
  const ganacheProvider = Ganache.provider()
  return { ganacheProvider, forceNextBlock }

  async function forceNextBlock() {
    // custom ganache method
    await ganacheProvider.request(createPayload({ method: 'evm_mine' }))
  }
}

function createEngineFromTestBlockMiddleware() {
  const testBlockSource = new TestBlockMiddleware()
  const engine = JsonRpcEngineV2.create({
    middleware: [testBlockSource.createMiddleware()]
  })
  return { engine, testBlockSource }
}

function createPayload(payload) {
  return Object.assign({ id: 1, jsonrpc: '2.0', params: [] }, payload)
}

function asyncTest(asyncTestFn) {
  return async function (t) {
    try {
      await asyncTestFn(t)
      t.end()
    } catch (err) {
      t.end(err)
    }
  }
}

function timeout(duration) {
  return new Promise(resolve => setTimeout(resolve, duration))
}


async function deployLogEchoContract({ tools, from }) {
  // https://github.com/kumavis/eth-needlepoint/blob/master/examples/emit-log.js
  const { request } = tools;
  const deployTxHash = await request({
    method: 'eth_sendTransaction',
    params: [{
      from,
      data: '0x600e600c600039600e6000f336600060003760005160206000a1'
    }]
  })

  await tools.trackNextBlock()
  const deployTxRx = await request({
    method: 'eth_getTransactionReceipt',
    params: [deployTxHash]
  })
  const contractAddress = deployTxRx.contractAddress
  return {
    deployTxHash,
    deployTxRx,
    contractAddress,
  }
}
