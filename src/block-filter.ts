import type { InternalProvider } from '@metamask/eth-json-rpc-provider';

import { BaseFilter } from './base-filter.js';
import type { FilterUpdate } from './base-filter.js';
import { getBlocksForRange } from './getBlocksForRange.js';
import { incrementHexInt } from './hexUtils.js';

export class BlockFilter extends BaseFilter<string> {
  readonly type = 'block';

  readonly provider: InternalProvider;

  constructor({ provider }: { provider: InternalProvider }) {
    super();
    this.provider = provider;
  }

  override async update({ oldBlock, newBlock }: FilterUpdate): Promise<void> {
    const toBlock = newBlock;
    const fromBlock = incrementHexInt(oldBlock);
    const blockBodies = await getBlocksForRange({
      provider: this.provider,
      fromBlock,
      toBlock,
    });
    const blockHashes = blockBodies.map((block) => block.hash);
    this.addResults(blockHashes);
  }
}
