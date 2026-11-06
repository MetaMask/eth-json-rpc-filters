import type { InternalProvider } from '@metamask/eth-json-rpc-provider';
import type { Json } from '@metamask/utils';

export type Block = {
  hash: string;
  parentHash: string;
  transactions: string[];
  [key: string]: Json;
};

export async function getBlocksForRange({
  provider,
  fromBlock,
  toBlock,
}: {
  provider: InternalProvider;
  fromBlock?: string | null;
  toBlock: string;
}): Promise<Block[]> {
  const startBlock = fromBlock || toBlock;

  const fromBlockNumber = hexToInt(startBlock);
  const toBlockNumber = hexToInt(toBlock);
  const blockCountToQuery = toBlockNumber - fromBlockNumber + 1;
  // load all blocks from old to new (inclusive)
  const missingBlockNumbers = Array(blockCountToQuery)
    .fill(undefined)
    .map((_, index) => fromBlockNumber + index)
    .map(intToHex);
  const blockBodies = await Promise.all(
    missingBlockNumbers.map((blockNum) =>
      query(provider, 'eth_getBlockByNumber', [blockNum, false]),
    ),
  );
  return blockBodies.filter((block): block is Block => block !== null);
}

function hexToInt(hexString: string): number {
  return Number.parseInt(hexString, 16);
}

function intToHex(int: number): string {
  return `0x${int.toString(16)}`;
}

async function query(
  provider: InternalProvider,
  method: string,
  params: Json[],
): Promise<Block | null> {
  for (let i = 0; i < 3; i++) {
    try {
      return provider.request({
        id: 1,
        jsonrpc: '2.0',
        method,
        params,
      }) as Promise<Block | null>;
    } catch (error) {
      console.error(
        `provider.request failed: ${(error as Error).stack || (error as Error).message || error}`,
      );
    }
  }
  return null;
}
