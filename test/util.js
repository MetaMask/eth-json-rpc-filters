const EthBlockTracker = require('eth-block-tracker')
const EthQuery = require('ethjs-query')
const JsonRpcEngine = require('json-rpc-engine')
const asMiddleware = require('json-rpc-engine/src/asMiddleware')
const createBlockRefMiddleware = require('eth-json-rpc-middleware/block-ref')
const TestBlockMiddleware = require('eth-block-tracker/test/util/testBlockMiddleware')
const createScaffoldMiddleware = require('eth-json-rpc-middleware/scaffold')
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
  createLegacyTestSetup,
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
  engine.push(createBlockRefMiddleware({ blockTracker }))
  // add filter middleware
  engine.push(createFilterMiddleware({ blockTracker, provider }))
  // add data source
  engine.push(providerAsMiddleware(ganacheProvider))

  // start the block tracker
  blockTracker.start()

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

function createLegacyTestSetup () {
  // raw data source
  const { engine: dataEngine, testBlockSource } = createEngineFromTestBlockMiddleware()
  const dataProvider = providerFromEngine(dataEngine)
  // create block trackerfilterId
  const blockTracker = new EthBlockTracker({
    provider: dataProvider,
    pollingInterval: 200,
  })
  // create higher level
  const engine = new JsonRpcEngine()
  const provider = providerFromEngine(engine)
  // add block ref middleware
  engine.push(createBlockRefMiddleware({ blockTracker }))
  // matching logs middleware
  const matchingTxs = []
  engine.push(createScaffoldMiddleware({ eth_getLogs: matchingTxs }))
  // add data source
  engine.push(asMiddleware(dataEngine))
  const query = new EthQuery(provider)
  return { engine, provider, dataEngine, dataProvider, query, blockTracker, testBlockSource, matchingTxs }
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
