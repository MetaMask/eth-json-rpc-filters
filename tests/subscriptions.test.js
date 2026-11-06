import { describe, expect, it } from 'vitest'
import {
  createTestSetup,
  timeout,
  deployLogEchoContract,
} from './util'

describe('subscription middleware', () => {
  it('subscriptions - newHeads', async () => {
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
    expect(subId).toBeTruthy()
    expect(typeof subId).toBe('string')

    // check sub
    expect(subResults).toHaveLength(0)

    // await one block
    await tools.forceNextBlock()
    await tools.trackNextBlock()

    // await for subscription results to be processed, then check recorded sub results
    await timeout(200)
    expect(subResults).toHaveLength(1)

    // await two blocks
    await tools.forceNextBlock()
    await tools.trackNextBlock()
    await tools.forceNextBlock()
    await tools.trackNextBlock()

    // await for subscription results to be processed, then check recorded sub results
    await timeout(200)
    expect(subResults).toHaveLength(3)

    // uninstall subscription
    await sub.uninstall()
  })

  it('subscriptions - log', async () => {
    const tools = createTestSetup()
    const { request, subs, blockTracker } = tools

    // deploy log-echo contract
    const accounts = await request({
      method: "eth_accounts",
      params: []
    });
    const fromAcccount = accounts[0];
    const { contractAddress } = await deployLogEchoContract({ tools, from: fromAcccount })
    expect(contractAddress).toBeTruthy()
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
    expect(subId).toBeTruthy()
    expect(typeof subId).toBe('string')

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
    expect(subResults).toHaveLength(1)
    const matchingResults = subResults[0]
    expect(matchingResults.transactionHash).toBe(triggeringTxHash)
    expect(matchingResults.topics.length).toBe(1)
    const matchedTopic = matchingResults.topics[0]
    expect(matchedTopic).toBe(targetTopic)

    await sub.uninstall()
  })
})
