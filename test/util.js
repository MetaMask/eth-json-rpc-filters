const EventEmitter = require('events')
const { PollingBlockTracker } = require('@metamask/eth-block-tracker')
const { JsonRpcEngine } = require('@metamask/json-rpc-engine')
const { providerAsMiddleware } = require('@metamask/eth-json-rpc-middleware')
const { providerFromEngine } = require('@metamask/eth-json-rpc-provider')
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
  // create block trackerfilterId
  const blockTracker = new PollingBlockTracker({
    provider: ganacheProvider,
    pollingInterval: 200,
  })
  // create higher level
  const engine = new JsonRpcEngine()
  const provider = providerFromEngine(engine)
  const request = provider.request.bind(provider);
  // add filter middleware
  engine.push(createFilterMiddleware({ blockTracker, provider }))
  // add subscription middleware
  const subscriptionManager = createSubscriptionMiddleware({ blockTracker, provider })
  engine.push(subscriptionManager.middleware)
  subscriptionManager.events.on('notification', (message) => engine.emit('notification', message))
  // add data source
  engine.push(providerAsMiddleware(ganacheProvider))

  // subs helper
  const subs = createSubsHelper({ provider })

  return { ganacheProvider, forceNextBlock, engine, provider, request, subs, blockTracker, trackNextBlock }

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
  const engine = new JsonRpcEngine()
  const testBlockSource = new TestBlockMiddleware()
  engine.push(testBlockSource.createMiddleware())
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
