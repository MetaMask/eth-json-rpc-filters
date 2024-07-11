const test = require('tape')
const {
  createTestSetup,
  asyncTest,
  timeout,
  deployLogEchoContract,
} = require('./util')

test('subscriptions - newHeads', asyncTest(async (t) => {

  const tools = createTestSetup()
  const subs = tools.subs

  // await first block
  await tools.forceNextBlock()
  await tools.trackNextBlock()

  // create sub
  const subResults = []
  const sub = await subs.newHeads()
  sub.events.on('notification', (value) => {
    subResults.push(value)
  })
  const subId = sub.id
  t.ok(subId, `got sub id: ${subId} (${typeof subId})`)
  t.equal(typeof subId, 'string', `got sub id as hex string (${typeof subId})`)

  // check sub
  t.equal(subResults.length, 0, 'no sub results yet')

  // await one block
  await tools.forceNextBlock()
  await tools.trackNextBlock()

  // await for subscription results to be processed, then check recorded sub results
  await timeout(200)
  t.equal(subResults.length, 1, 'only one sub result')

  // await two blocks
  await tools.forceNextBlock()
  await tools.trackNextBlock()
  await tools.forceNextBlock()
  await tools.trackNextBlock()

  // await for subscription results to be processed, then check recorded sub results
  await timeout(200)
  t.equal(subResults.length, 3, 'three sub results')

  // uninstall subscription
  await sub.uninstall()
}))

test('subscriptions - log', asyncTest(async (t) => {

  const tools = createTestSetup()
  const { request, subs, blockTracker } = tools

  // deploy log-echo contract
  const accounts = await request({
    method: "eth_accounts",
    params: []
  });
  const fromAcccount = accounts[0];
  const { contractAddress } = await deployLogEchoContract({ tools, from: fromAcccount })
  t.ok(contractAddress, 'got deployed contract address')
  // deploy secondary "wrong" log contract
  const wrongContractAddress = (await deployLogEchoContract({ tools, from: fromAcccount })).contractAddress

  // create subscription
  const subResults = []
  const blockNumber = await blockTracker.getLatestBlock()
  const targetTopic = '0xaabbcce106361d4f6cd9098051596d565c1dbf7bc20b4c3acb3aaa4204aabbcc'
  const wrongTopic = '0xffffffe106361d4f6cd9098051596d565c1dbf7bc20b4c3acb3aaa4204ffffff'
  const filterParams = { address: contractAddress, topics: [targetTopic], fromBlock: blockNumber, toBlock: 'latest' }
  const sub = await subs.logs(filterParams)
  sub.events.on('notification', (value) => {
    subResults.push(value)
  })

  // verify subId
  const subId = sub.id
  t.ok(subId, `got filter id: ${subId} (${typeof subId})`)
  t.equal(typeof subId, 'string', `got sub id as hex string (${typeof subId})`)

  // trigger matching log
  const triggeringTxHash = await request({
    method: 'eth_sendTransaction',
    params: [{ from: fromAcccount, to: contractAddress, data: targetTopic }]
  })
  await tools.trackNextBlock()

  // trigger non-matching log
  await request({
    method: 'eth_sendTransaction',
    params: [{
      from: fromAcccount,
      to: contractAddress,
      data: wrongTopic
    }]
  })
  await tools.trackNextBlock()

  // trigger non-matching contract
  await request({
    method: 'eth_sendTransaction',
    params: [{ from: fromAcccount, to: wrongContractAddress, data: targetTopic }]
  })
  await tools.trackNextBlock()

  // wait for subscription results to update
  await timeout(200)

  // check subscription results
  t.equal(subResults.length, 1, 'only one matched filter')
  const matchingResults = subResults[0]
  t.equal(matchingResults.transactionHash, triggeringTxHash, 'tx hash should match')
  t.equal(matchingResults.topics.length, 1, 'emitted a single log topic')
  const matchedTopic = matchingResults.topics[0]
  t.equal(matchedTopic, targetTopic, 'topic matches expected')

  await sub.uninstall()
}))
