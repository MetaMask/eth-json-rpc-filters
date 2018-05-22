const BaseFilter = require('./base-filter')
const getBlocksForRange = require('./getBlocksForRange')
const { incrementHexInt } = require('./hexUtils')

class BlockFilter extends BaseFilter {

  constructor ({ ethQuery, params }) {
    super()
    this.type = 'block'
    this.ethQuery = ethQuery
  }

  async update ({ oldBlock, newBlock }) {
    const toBlock = newBlock
    const fromBlock = incrementHexInt(oldBlock)
    const blockBodies = await getBlocksForRange({ ethQuery: this.ethQuery, fromBlock, toBlock })
    const blockHashes = blockBodies.map((block) => block.hash)
    this.addResults(blockHashes)
  }

}

module.exports = BlockFilter
