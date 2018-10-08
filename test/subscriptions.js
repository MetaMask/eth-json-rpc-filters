const test = require('tape')
const {
  createTestSetup,
  createPayload,
  asyncTest,
  timeout,
} = require('./util')

test('BlockFilter - basic', asyncTest(async (t) => {

  const tools = createTestSetup()
  const eth = tools.query
  const subs = tools.subs

  const { blockTracker } = tools

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
  t.equal(typeof subId, 'string', `got sub id as number (${typeof subId})`)

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
