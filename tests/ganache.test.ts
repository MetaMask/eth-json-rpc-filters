import { describe, expect, it } from 'vitest';

import { createTestSetup, deployLogEchoContract } from './util.js';

describe('eth filter middleware', () => {
  it('logFilter - basic', async () => {
    const tools = createTestSetup();
    const { request } = tools;

    // deploy log-echo contract
    const accounts = await request({
      method: 'eth_accounts',
      params: [],
    });
    const fromAccount = accounts[0];
    const { contractAddress } = await deployLogEchoContract({
      tools,
      from: fromAccount,
    });
    expect(contractAddress).toBeTruthy();

    // create filter
    const blockNumber = await request({ method: 'eth_blockNumber' });
    const targetTopic =
      '0xaabbcce106361d4f6cd9098051596d565c1dbf7bc20b4c3acb3aaa4204aabbcc';
    const filterId = await request({
      method: 'eth_newFilter',
      params: {
        address: contractAddress,
        topics: [targetTopic],
        fromBlock: blockNumber,
        toBlock: 'latest',
      },
    });
    expect(filterId).toBeTruthy();

    // trigger filter
    const triggeringTxHash = await request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: fromAccount,
          to: contractAddress,
          data: targetTopic,
        },
      ],
    });
    await tools.trackNextBlock();
    // check filter
    const filterChanges = await request({
      method: 'eth_getFilterChanges',
      params: [filterId],
    });
    expect(filterChanges).toHaveLength(1);
    const matchingFilter = filterChanges[0];
    expect(matchingFilter.transactionHash).toBe(triggeringTxHash);
    expect(matchingFilter.topics).toHaveLength(1);
    const matchedTopic = matchingFilter.topics[0];
    expect(matchedTopic).toBe(targetTopic);

    await request({ method: 'eth_uninstallFilter', params: [filterId] });
  });

  it('logFilter - multiple blocks', async () => {
    const tools = createTestSetup();
    const { request } = tools;

    // deploy log-echo contract
    const accounts = await request({
      method: 'eth_accounts',
      params: [],
    });
    const fromAcccount = accounts[0];
    const { contractAddress } = await deployLogEchoContract({
      tools,
      from: fromAcccount,
    });
    expect(contractAddress).toBeTruthy();

    // create filter
    const blockNumber = await request({ method: 'eth_blockNumber' });
    const targetTopic =
      '0x112233e106361d4f6cd9098051596d565c1dbf7bc20b4c3acb3aaa4204112233';
    const filterId = await request({
      method: 'eth_newFilter',
      params: [
        {
          address: contractAddress,
          topics: [targetTopic],
          fromBlock: blockNumber,
          toBlock: 'latest',
        },
      ],
    });
    expect(filterId).toBeTruthy();

    // await multiple blocks
    await tools.forceNextBlock();
    await tools.trackNextBlock();
    await tools.forceNextBlock();
    await tools.trackNextBlock();
    await tools.forceNextBlock();
    await tools.trackNextBlock();

    // trigger filter
    const triggeringTxHash = await request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: fromAcccount,
          to: contractAddress,
          data: targetTopic,
        },
      ],
    });
    await tools.trackNextBlock();

    // await multiple blocks
    await tools.forceNextBlock();
    await tools.trackNextBlock();
    await tools.forceNextBlock();
    await tools.trackNextBlock();

    // check filter
    const filterChanges = await request({
      method: 'eth_getFilterChanges',
      params: [filterId],
    });
    expect(filterChanges).toHaveLength(1);
    const matchingFilter = filterChanges[0];
    expect(matchingFilter.transactionHash).toBe(triggeringTxHash);
    expect(matchingFilter.topics).toHaveLength(1);
    const matchedTopic = matchingFilter.topics[0];
    expect(matchedTopic).toBe(targetTopic);

    await request({ method: 'eth_uninstallFilter', params: [filterId] });
  });

  it('blockFilter - basic', async () => {
    const tools = createTestSetup();
    const { request } = tools;

    // await first block
    await tools.trackNextBlock();

    // create filter
    const filterId = await request({ method: 'eth_newBlockFilter' });
    expect(filterId).toBeTruthy();

    // check filter
    const filterChanges1 = await request({
      method: 'eth_getFilterChanges',
      params: [filterId],
    });
    expect(filterChanges1).toHaveLength(0);

    // await one block
    await tools.forceNextBlock();
    await tools.trackNextBlock();
    // check filter
    const filterChanges2 = await request({
      method: 'eth_getFilterChanges',
      params: [filterId],
    });
    expect(filterChanges2).toHaveLength(1);
    const matchingFilter1 = filterChanges2[0];
    expect(matchingFilter1).toHaveLength(2 + 32 * 2);
    // check filter
    const filterChanges3 = await request({
      method: 'eth_getFilterChanges',
      params: [filterId],
    });
    expect(filterChanges3).toHaveLength(0);

    // await two blocks
    await tools.forceNextBlock();
    await tools.trackNextBlock();
    await tools.forceNextBlock();
    await tools.trackNextBlock();

    // check filter
    const filterChanges4 = await request({
      method: 'eth_getFilterChanges',
      params: [filterId],
    });
    expect(filterChanges4).toHaveLength(2);
    const matchingFilter2 = filterChanges4[0];
    const matchingFilter3 = filterChanges4[1];
    expect(matchingFilter2).toHaveLength(2 + 32 * 2);
    expect(matchingFilter3).toHaveLength(2 + 32 * 2);
    expect(matchingFilter2).not.toBe(matchingFilter3);

    await request({
      method: 'eth_uninstallFilter',
      params: [filterId],
    });
  });
});
