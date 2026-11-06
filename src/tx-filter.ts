import type { InternalProvider } from '@metamask/eth-json-rpc-provider';

import { BaseFilter } from './base-filter.js';
import type { FilterUpdate } from './base-filter.js';
import { getBlocksForRange } from './getBlocksForRange.js';
import { incrementHexInt } from './hexUtils.js';

export class TxFilter extends BaseFilter<string> {
  readonly type = 'tx';

  readonly provider: InternalProvider;

  constructor({ provider }: { provider: InternalProvider }) {
    super();
    this.provider = provider;
  }

  override async update({ oldBlock }: FilterUpdate): Promise<void> {
    // `oldBlock` is not guaranteed to be set on the first sync, which this
    // preserves from the JavaScript implementation.
    const toBlock = oldBlock as string;
    const fromBlock = incrementHexInt(oldBlock);
    const blocks = await getBlocksForRange({
      provider: this.provider,
      fromBlock,
      toBlock,
    });
    const blockTxHashes: string[] = [];
    for (const block of blocks) {
      blockTxHashes.push(...block.transactions);
    }
    // add to results
    this.addResults(blockTxHashes);
  }
}
