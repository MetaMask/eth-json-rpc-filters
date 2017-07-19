const BaseFilter = require('./base-filter')

class LogFilter extends BaseFilter {

  constructor ({ ethQuery, params }) {
    _super()
    this.type = 'log'
    this.ethQuery = ethQuery
    this.params = Object.assign({
      fromBlock: 'earliest',
      toBlock: 'latest',
      address: undefined,
      topics: [],
    }, params)
  }

  async update ({ oldBlock, newBlock }) {
    // configure params for this update
    // oldBlock is empty on boot
    if (!oldBlock) oldBlock = newBlock
    const fromBlock = maxBlockRef(this.params.fromBlock, oldBlock.number)
    const toBlock = minBlockRef(this.params.toBlock, newBlock.number)
    const params = Object.assign({}, this.params, { fromBlock, toBlock })
    // fetch logs
    const newLogs = await ethQuery.getLogs(params)
    // add to results
    this.addResults(newLogs)
  }

}

function minBlockRef(...refs) {
  const sortedRefs = sortBlockRefs(refs)
  return sortedRefs[0]
}

function maxBlockRef(...refs) {
  const sortedRefs = sortBlockRefs(refs)
  return sortedRefs[sortedRefs.length-1]
}

function sortBlockRefs(refs) {
  return refs.sort((refA, refB) => {
    if (refA === 'latest' || refB === 'earliest') return 1
    if (refB === 'latest' || refA === 'earliest') return -1
    return (Number.parseInt(refA, 16) > Number.parseInt(refB, 16)) ? 1 : -1
  })
}
