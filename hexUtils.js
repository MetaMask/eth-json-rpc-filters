module.exports = {
  minBlockRef,
  maxBlockRef,
  sortBlockRefs,
  bnToHex,
  blockRefIsNumber,
  hexToInt,
  incrementHexInt,
  intToHex,
  unsafeRandomBytes,
};

/**
 * Returns the minimum block reference from the provided references.
 *
 * @param {...string} refs - The block references to compare.
 * @returns {string} The minimum block reference.
 */
function minBlockRef(...refs) {
  const sortedRefs = sortBlockRefs(refs);
  return sortedRefs[0];
}

/**
 * Returns the maximum block reference from the provided references.
 *
 * @param {...string} refs - The block references to compare.
 * @returns {string} The maximum block reference.
 */
function maxBlockRef(...refs) {
  const sortedRefs = sortBlockRefs(refs);
  return sortedRefs[sortedRefs.length - 1];
}

/**
 * Sorts the block references in ascending order.
 *
 * @param {string[]} refs - The block references to sort.
 * @returns {string[]} The sorted block references.
 */
function sortBlockRefs(refs) {
  return refs.sort((refA, refB) => {
    if (refA === 'latest' || refB === 'earliest') {
      return 1;
    }
    if (refB === 'latest' || refA === 'earliest') {
      return -1;
    }
    return hexToInt(refA) - hexToInt(refB);
  });
}

/**
 * Converts a BigNumber to a hexadecimal string.
 *
 * @param {object} bn - The BigNumber to convert.
 * @returns {string} The hexadecimal string representation of the BigNumber.
 */
function bnToHex(bn) {
  return `0x${bn.toString(16)}`;
}

/**
 * Checks if the block reference is a number.
 *
 * @param {string} blockRef - The block reference to check.
 * @returns {boolean} True if the block reference is a number, false otherwise.
 */
function blockRefIsNumber(blockRef) {
  return blockRef && !['earliest', 'latest', 'pending'].includes(blockRef);
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
 * Increments a hexadecimal string by 1.
 *
 * @param {string} hexString - The hexadecimal string to increment.
 * @returns {string} The incremented hexadecimal string.
 */
function incrementHexInt(hexString) {
  if (hexString === undefined || hexString === null) {
    return hexString;
  }
  const value = hexToInt(hexString);
  return intToHex(value + 1);
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
  let hexString = integer.toString(16);
  const needsLeftPad = hexString.length % 2;
  if (needsLeftPad) {
    hexString = `0${hexString}`;
  }
  return `0x${hexString}`;
}

/**
 * Generates a random hexadecimal string of the specified byte count.
 *
 * @param {number} byteCount - The number of bytes.
 * @returns {string} The random hexadecimal string.
 */
function unsafeRandomBytes(byteCount) {
  let result = '0x';
  for (let i = 0; i < byteCount; i++) {
    result += unsafeRandomNibble();
    result += unsafeRandomNibble();
  }
  return result;
}

/**
 * Generates a random hexadecimal nibble (4 bits).
 *
 * @returns {string} The random hexadecimal nibble.
 */
function unsafeRandomNibble() {
  return Math.floor(Math.random() * 16).toString(16);
}
