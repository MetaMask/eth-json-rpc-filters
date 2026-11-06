import EthQuery from '@metamask/eth-query';
import type { InternalProvider } from '@metamask/eth-json-rpc-provider';

import { BaseFilterWithHistory } from './base-filter-history.js';
import type { FilterUpdate } from './base-filter.js';
import {
  blockRefIsNumber,
  hexToInt,
  incrementHexInt,
  minBlockRef,
} from './hexUtils.js';

export type Log = {
  address?: string;
  blockNumber: string;
  topics: string[];
  [key: string]: unknown;
};

export type LogFilterParams = {
  fromBlock?: string;
  toBlock?: string;
  address?: string | string[];
  topics?: (string | string[] | null)[];
};

type NormalizedLogFilterParams = {
  fromBlock: string;
  toBlock: string;
  address?: string[];
  topics: (string | string[] | null)[];
};

export class LogFilter extends BaseFilterWithHistory<Log> {
  readonly type = 'log';

  readonly ethQuery: EthQuery;

  readonly params: NormalizedLogFilterParams;

  constructor({
    provider,
    params,
  }: {
    provider?: InternalProvider;
    params?: LogFilterParams;
  }) {
    super();
    this.ethQuery = new EthQuery(provider as InternalProvider);
    const { address, ...rest } = {
      fromBlock: 'latest',
      toBlock: 'latest',
      address: undefined as string | string[] | undefined,
      topics: [] as (string | string[] | null)[],
      ...params,
    };
    this.params = rest;
    // normalize address parameter
    if (address) {
      // ensure array, then ensure lowercase
      this.params.address = (Array.isArray(address) ? address : [address]).map(
        (value) => value.toLowerCase(),
      );
    }
  }

  override async initialize({
    currentBlock,
  }: {
    currentBlock: string;
  }): Promise<void> {
    // resolve params.fromBlock
    let { fromBlock } = this.params;
    if (['latest', 'pending'].includes(fromBlock)) {
      fromBlock = currentBlock;
    }
    if (fromBlock === 'earliest') {
      fromBlock = '0x0';
    }
    this.params.fromBlock = fromBlock;
    // set toBlock for initial lookup
    const toBlock = minBlockRef(this.params.toBlock, currentBlock);
    const params = { ...this.params, toBlock };
    // fetch logs and add to results
    const newLogs = await this._fetchLogs(params);
    this.addInitialResults(newLogs);
  }

  override async update({ oldBlock, newBlock }: FilterUpdate): Promise<void> {
    // configure params for this update
    const toBlock = newBlock;
    let fromBlock;
    // oldBlock is empty on first sync
    if (oldBlock) {
      fromBlock = incrementHexInt(oldBlock);
    } else {
      fromBlock = newBlock;
    }
    // fetch logs
    const params = { ...this.params, fromBlock, toBlock };
    const newLogs = await this._fetchLogs(params);
    const matchingLogs = newLogs.filter((log) => this.matchLog(log));

    // add to results
    this.addResults(matchingLogs);
  }

  async _fetchLogs(params: NormalizedLogFilterParams): Promise<Log[]> {
    return new Promise((resolve, reject) => {
      this.ethQuery.getLogs(params, (error: unknown, logs: Log[]) =>
        error ? reject(error) : resolve(logs),
      );
    });
  }

  matchLog(log: Log): boolean {
    // check if block number in bounds:
    if (hexToInt(this.params.fromBlock) >= hexToInt(log.blockNumber)) {
      return false;
    }
    if (
      blockRefIsNumber(this.params.toBlock) &&
      hexToInt(this.params.toBlock) <= hexToInt(log.blockNumber)
    ) {
      return false;
    }

    // address is correct:
    const normalizedLogAddress = log.address?.toLowerCase();
    if (
      this.params.address &&
      normalizedLogAddress &&
      !this.params.address.includes(normalizedLogAddress)
    ) {
      return false;
    }

    // topics match:
    // topics are position-dependant
    // topics can be nested to represent `or` [[a || b], c]
    // topics can be null, representing a wild card for that position
    return this.params.topics.every((topicPattern, index) => {
      // pattern is longer than actual topics
      const logTopic = log.topics[index]?.toLowerCase();
      if (!logTopic) {
        return false;
      }
      // normalize subTopics
      const subtopicsToMatch = Array.isArray(topicPattern)
        ? topicPattern
        : [topicPattern];
      // check for wild card
      if (subtopicsToMatch.includes(null as never)) {
        return true;
      }
      // check each possible matching topic
      return subtopicsToMatch
        .map((topic) => (topic as string).toLowerCase())
        .includes(logTopic);
    });
  }
}
