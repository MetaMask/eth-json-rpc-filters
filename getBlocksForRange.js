const { intToHex, hexToInt } = require('./hexUtils')

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

function sendAsync(provider, request) {
  return new Promise((resolve, reject) => {
    provider.sendAsync(request, (error, response) => {
      if (error) {
        reject(error);
      } else if (response.error) {
        reject(response.error);
      } else if (response.result) {
        resolve(response.result);
      } else {
        reject(new Error("Result was empty"));
      }
    });
  });
}

async function query(provider, method, params) {
  for (let i = 0; i < 3; i++) {
    try {
      return await sendAsync(provider, {
        id: 1,
        jsonrpc: "2.0",
        method,
        params,
      });
    } catch (error) {
      console.error(
        `provider.sendAsync failed: ${error.stack || error.message || error}`
      );
    }
  }
  return null;
}
