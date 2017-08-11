const flatMap = require('lodash.flatmap')
const BaseFilter = require('./base-filter')
const getBlocksForRange = require('./getBlocksForRange')

class TxFilter extends BaseFilter {

  constructor ({ ethQuery, params }) {
    super()
    this.type = 'tx'
    this.ethQuery = ethQuery
  }

  async update ({ oldBlock, newBlock }) {
    const blocks = await getBlocksForRange({ ethQuery: this.ethQuery, oldBlock, newBlock })
    const blockTxs = flatMap(blocks, (block) => block.transactions)
    const blockTxHashes = blockTxs.map((tx) => tx.hash)
    // add to results
    this.addResults(blockTxHashes)
  }

}

module.exports = TxFilter
