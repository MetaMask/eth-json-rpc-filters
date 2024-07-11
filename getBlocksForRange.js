module.exports = getBlocksForRange

async function getBlocksForRange({ provider, fromBlock, toBlock }) {
  if (!fromBlock) fromBlock = toBlock

  const fromBlockNumber = hexToInt(fromBlock)
  const toBlockNumber = hexToInt(toBlock)
  const blockCountToQuery = toBlockNumber - fromBlockNumber + 1
  // load all blocks from old to new (inclusive)
  const missingBlockNumbers = Array(blockCountToQuery).fill()
                              .map((_,index) => fromBlockNumber + index)
                              .map(intToHex)
  let blockBodies = await Promise.all(
    missingBlockNumbers.map(blockNum => query(provider, 'eth_getBlockByNumber', [blockNum, false]))
  )
  blockBodies = blockBodies.filter(block => block !== null);
  return blockBodies
}

function hexToInt(hexString) {
  if (hexString === undefined || hexString === null) return hexString
  return Number.parseInt(hexString, 16)
}

function incrementHexInt(hexString){
  if (hexString === undefined || hexString === null) return hexString
  const value = hexToInt(hexString)
  return intToHex(value + 1)
}

function intToHex(int) {
  if (int === undefined || int === null) return int
  const hexString = int.toString(16)
  return '0x' + hexString
}

async function request(provider, request) {
  return provider.request(request);
}

async function query(provider, method, params) {
  for (let i = 0; i < 3; i++) {
    try {
      return await request(provider, {
        id: 1,
        jsonrpc: "2.0",
        method,
        params,
      });
    } catch (error) {
      console.error(
        `provider.request failed: ${error.stack || error.message || error}`
      );
    }
  }
  return null;
}
