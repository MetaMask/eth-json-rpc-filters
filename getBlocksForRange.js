module.exports = getBlocksForRange

async function getBlocksForRange({ ethQuery, oldBlock, newBlock }) {
  let blocks = []

  // oldBlock is empty on boot
  if (!oldBlock) oldBlock = newBlock

  const oldBlockNumber = hexToInt(newBlock.number)
  const newBlockNumber = hexToInt(newBlock.number)
  const blockNumDelta = newBlockNumber - oldBlockNumber
  // load all blocks between old and new
  if (blockNumDelta > 1) {
    const missingBlockNumbers = Array(blockNumDelta - 1).fill()
                                .map((_,index) => oldBlockNumber + index + 1)
                                .map(intToHex)
    const missingblocks = await Promise.all(missingBlockNumbers.map((blockNum) => ethQuery.getBlockByNumber(blockNum, true)))
    blocks = blocks.concat(missingblocks)
  }
  blocks.push(newBlock)
}

function intToHex(int) {
  return '0x' + int.toString(16)
}

function hexToInt(hex) {
  return Number.parseInt(hex, 16)
}