const EthBlockTracker = require('eth-block-tracker')
const EthQuery = require('ethjs-query')
const JsonRpcEngine = require('json-rpc-engine')
const providerAsMiddleware = require('eth-json-rpc-middleware/providerAsMiddleware')
const providerFromEngine = require('eth-json-rpc-middleware/providerFromEngine')
const GanacheCore = require('ganache-core')
const pify = require('pify')
const createFilterMiddleware = require('../index.js')

module.exports = {
  createPayload,
  createEngineFromGanacheCore,
  createEngineFromTestBlockMiddleware,
  createTestSetup,
}

function createTestSetup () {
  // raw data source
  const { ganacheProvider, forceNextBlock } = createEngineFromGanacheCore()
  // create block trackerfilterId
  const blockTracker = new EthBlockTracker({
    provider: ganacheProvider,
    pollingInterval: 200,
  })
  // create higher level
  const engine = new JsonRpcEngine()
  const provider = providerFromEngine(engine)
  const query = new EthQuery(provider)
  // add block ref middleware
  // add filter middleware
  engine.push(createFilterMiddleware({ blockTracker, provider }))
  // add data source
  engine.push(providerAsMiddleware(ganacheProvider))

  return { ganacheProvider, forceNextBlock, engine, provider, query, blockTracker, trackNextBlock }

  async function trackNextBlock() {
    return new Promise((resolve) => blockTracker.once('latest', resolve))
  }
}

function createEngineFromGanacheCore () {
  const ganacheProvider = GanacheCore.provider()
  return { ganacheProvider, forceNextBlock }

  async function forceNextBlock() {
    // custom ganache-core method
    await pify(ganacheProvider.sendAsync).call(ganacheProvider, createPayload({ method: 'evm_mine' }))
  }
}

function createEngineFromTestBlockMiddleware () {
  const engine = new JsonRpcEngine()
  const testBlockSource = new TestBlockMiddleware()
  engine.push(testBlockSource.createMiddleware())
  return { engine, testBlockSource }
}

function createPayload(payload) {
  return Object.assign({ id: 1, jsonrpc: '2.0', params: [] }, payload)
}
