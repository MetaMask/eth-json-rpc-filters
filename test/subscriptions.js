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
  // if you remove this the test breaks
  blockTracker.on('sync', ({ oldBlock, newBlock }) => console.log('test sync', {oldBlock, newBlock}))

  // await first block
  await tools.trackNextBlock()
  await tools.forceNextBlock()
  console.log('tracking next block start')
  const xyz = await tools.trackNextBlock()
  console.log('tracking next block done', xyz)
  await timeout(1000)

  // create sub
  const subResults = []
  const sub = await subs.newHeads()
  sub.events.on('notification', (value) => {
    subResults.push(value)
  })
  const subId = sub.id
  t.ok(subId, `got sub id: ${subId} (${typeof subId})`)

  // check sub
  t.equal(subResults.length, 0, 'no sub results yet')

  // await one block
  await tools.forceNextBlock()
  console.log('tracking next block start')
  await tools.trackNextBlock()
  console.log('tracking next block done')
  await timeout(1000)
  // console.log(subResults)

  // check sub
  t.equal(subResults.length, 1, 'only one sub result')

  // await two blocks
  await tools.forceNextBlock()
  console.log('tracking next block start')
  await tools.trackNextBlock()
  console.log('tracking next block done')
  await tools.forceNextBlock()
  console.log('tracking next block start')
  await tools.trackNextBlock()
  console.log('tracking next block done')
  await timeout(1000)
  // console.log(subResults)

  // check filter
  t.equal(subResults.length, 3, 'three sub results')

  // await eth.uninstallFilter(filterId)
}))
