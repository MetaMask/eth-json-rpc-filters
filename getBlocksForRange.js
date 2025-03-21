module.exports = getBlocksForRange;

/**
 * Retrieves blocks between a given range.
 *
 * @param {object} args - The options object.
 * @param {object} args.provider - The provider to use for querying blocks.
 * @param {string} args.fromBlock - The starting block number in hexadecimal format.
 * @param {string} args.toBlock - The ending block number in hexadecimal format.
 * @returns {Promise<Array>} A promise that resolves to an array of block bodies.
 */
async function getBlocksForRange({ provider, toBlock, fromBlock = toBlock }) {
  const fromBlockNumber = hexToInt(fromBlock);
  const toBlockNumber = hexToInt(toBlock);
  const blockCountToQuery = toBlockNumber - fromBlockNumber + 1;
  // load all blocks from old to new (inclusive)
  const missingBlockNumbers = Array(blockCountToQuery)
    .fill()
    .map((_, index) => fromBlockNumber + index)
    .map(intToHex);
  let blockBodies = await Promise.all(
    missingBlockNumbers.map((blockNum) =>
      query(provider, 'eth_getBlockByNumber', [blockNum, false]),
    ),
  );
  blockBodies = blockBodies.filter((block) => block !== null);
  return blockBodies;
}

/**
 * Converts a hexadecimal string to an integer.
 *
 * @param {string} hexString - The hexadecimal string to convert.
 * @returns {number} The integer representation of the hexadecimal string.
 */
function hexToInt(hexString) {
  if (hexString === undefined || hexString === null) {
    return hexString;
  }
  return Number.parseInt(hexString, 16);
}

/**
 * Converts an integer to a hexadecimal string.
 *
 * @param {number} integer - The integer to convert.
 * @returns {string} The hexadecimal string representation of the integer.
 */
function intToHex(integer) {
  if (integer === undefined || integer === null) {
    return integer;
  }
  const hexString = integer.toString(16);
  return `0x${hexString}`;
}

/**
 * Queries the provider with the specified method and parameters.
 *
 * @param {object} provider - The provider to use for the query.
 * @param {string} method - The JSON-RPC method to call.
 * @param {Array} params - The parameters to pass to the method.
 * @returns {Promise<*>} A promise that resolves to the result of the query.
 */
async function query(provider, method, params) {
  for (let i = 0; i < 3; i++) {
    try {
      return provider.request({
        id: 1,
        jsonrpc: '2.0',
        method,
        params,
      });
    } catch (error) {
      console.error(
        `provider.request failed: ${error.stack || error.message || error}`,
      );
    }
  }
  return null;
}
