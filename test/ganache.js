const test = require('tape')
const clone = require('deep-clone')
const JsonRpcEngine = require('json-rpc-engine')
const asMiddleware = require('json-rpc-engine/src/asMiddleware')
const createScaffoldMiddleware = require('eth-json-rpc-middleware/scaffold')
const providerFromEngine = require('eth-json-rpc-middleware/providerFromEngine')
const ethUtil = require('ethereumjs-util')
const {
  createTestSetup,
  createPayload,
} = require('./util')

test('ganache - basic', asyncTest(async (t) => {

  const tools = createTestSetup()
  const eth = tools.query

  // deploy log-echo contract
  const coinbase = await eth.coinbase()
  const { contractAddress } = await deployLogEchoContract({ tools, from: coinbase })
  t.ok(contractAddress, 'got deployed contract address')

  // create filter
  const blockNumber = (await eth.blockNumber()).toNumber()
  const targetTopic = '0xaabbcce106361d4f6cd9098051596d565c1dbf7bc20b4c3acb3aaa4204aabbcc'
  const filterParams = { address: contractAddress, topics: [targetTopic], fromBlock: blockNumber, toBlock: 'latest' }
  const filterId = ethUtil.intToHex((await eth.newFilter(filterParams)).toNumber())
  t.ok(filterId, `got filter id: ${filterId} (${typeof filterId})`)

  // trigger filter
  const triggeringTxHash = await eth.sendTransaction({ from: coinbase, to: contractAddress, data: targetTopic })
  await tools.trackNextBlock()
  // check filter
  const filterChanges = await eth.getFilterChanges(filterId)
  t.equal(filterChanges.length, 1, 'only one matched filter')
  const matchingFilter = filterChanges[0]
  t.equal(matchingFilter.transactionHash, triggeringTxHash, 'tx hash should match')
  t.equal(matchingFilter.topics.length, 1, 'emitted a single log topic')
  const matchedTopic = matchingFilter.topics[0]
  t.equal(matchedTopic, targetTopic, 'topic matches expected')

  // cleanup
  tools.blockTracker.stop()

}))

test('ganache - multiple blocks', asyncTest(async (t) => {

  const tools = createTestSetup()
  const eth = tools.query

  // deploy log-echo contract
  const coinbase = await eth.coinbase()
  const { contractAddress } = await deployLogEchoContract({ tools, from: coinbase })
  t.ok(contractAddress, 'got deployed contract address')

  // create filter
  const blockNumber = (await eth.blockNumber()).toNumber()
  const targetTopic = '0x112233e106361d4f6cd9098051596d565c1dbf7bc20b4c3acb3aaa4204112233'
  const filterParams = { address: contractAddress, topics: [targetTopic], fromBlock: blockNumber, toBlock: 'latest' }
  const filterId = ethUtil.intToHex((await eth.newFilter(filterParams)).toNumber())
  t.ok(filterId, `got filter id: ${filterId} (${typeof filterId})`)

  // await multiple blocks
  await tools.forceNextBlock()
  await tools.trackNextBlock()
  await tools.forceNextBlock()
  await tools.trackNextBlock()
  await tools.forceNextBlock()
  await tools.trackNextBlock()

  // trigger filter
  console.log('triggering log')
  const triggeringTxHash = await eth.sendTransaction({ from: coinbase, to: contractAddress, data: targetTopic })
  await tools.trackNextBlock()

  // await multiple blocks
  await tools.forceNextBlock()
  await tools.trackNextBlock()
  await tools.forceNextBlock()
  await tools.trackNextBlock()

  // check filter
  const filterChanges = await eth.getFilterChanges(filterId)
  t.equal(filterChanges.length, 1, 'only one matched filter')
  const matchingFilter = filterChanges[0]
  t.equal(matchingFilter.transactionHash, triggeringTxHash, 'tx hash should match')
  t.equal(matchingFilter.topics.length, 1, 'emitted a single log topic')
  const matchedTopic = matchingFilter.topics[0]
  t.equal(matchedTopic, targetTopic, 'topic matches expected')

  // cleanup
  tools.blockTracker.stop()

}))

async function deployLogEchoContract({ tools, from }){
  // https://github.com/kumavis/eth-needlepoint/blob/master/examples/emit-log.js
  const eth = tools.query
  const deployTxHash = await eth.sendTransaction({ from, data: '0x600e600c600039600e6000f336600060003760005160206000a1' })
  await tools.trackNextBlock()
  const deployTxRx = await eth.getTransactionReceipt(deployTxHash)
  const contractAddress = deployTxRx.contractAddress
  return {
    deployTxHash,
    deployTxRx,
    contractAddress,
  }
}

function asyncTest(asyncTestFn){
  return async function(t) {
    try {
      await asyncTestFn(t)
      t.end()
    } catch (err) {
      t.end(err)
    }
  }
}
