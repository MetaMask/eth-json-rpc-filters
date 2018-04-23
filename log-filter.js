const BaseFilter = require('./base-filter')

class LogFilter extends BaseFilter {

  constructor ({ ethQuery, params }) {
    super()
    this.type = 'log'
    this.ethQuery = ethQuery
    this.params = Object.assign({
      fromBlock: 'latest',
      toBlock: 'latest',
      address: undefined,
      topics: [],
    }, params)
    // normalize address
    if (this.params.address) this.params.address = this.params.address.toLowerCase()
    // console.log('LogFilter - constructor - params', this.params)
  }

  async initialize({ currentBlock }) {
    // resolve params.fromBlock
    let fromBlock = this.params.fromBlock
    if (['latest', 'pending'].includes(fromBlock)) fromBlock = currentBlock.number
    if ('earliest' === fromBlock) fromBlock = '0x0'
    this.params.fromBlock = fromBlock
    // set toBlock for initial lookup
    const toBlock = minBlockRef(this.params.toBlock, currentBlock.number)
    const params = Object.assign({}, this.params, { toBlock })
    // fetch logs and add to results
    const newLogs = await this._fetchLogs(params)
    this.addInitialResults(newLogs)
  }

  async update ({ oldBlock, newBlock }) {
    // configure params for this update
    const toBlock = newBlock.number
    let fromBlock
    // oldBlock is empty on boot
    if (oldBlock) {
      fromBlock = incrementHexInt(oldBlock.number)
    } else {
      fromBlock = newBlock.number
    }
    // fetch logs
    const params = Object.assign({}, this.params, { fromBlock, toBlock })
    const newLogs = await this._fetchLogs(params)
    const matchingLogs = newLogs.filter(log => this.matchLog(log))

    // add to results
    this.addResults(matchingLogs)
  }

  async _fetchLogs (params) {
    const newLogs = await this.ethQuery.getLogs(params)
    // de-BN ethQuery results
    newLogs.forEach((log) => {
      log.blockNumber = bnToHex(log.blockNumber)
      log.logIndex = bnToHex(log.logIndex)
      log.transactionIndex = bnToHex(log.transactionIndex)
    })
    // add to results
    return newLogs
  }

  matchLog(log) {
    // console.log('LogFilter - validateLog:', log)

    // check if block number in bounds:
    // console.log('LogFilter - validateLog - blockNumber', this.fromBlock, this.toBlock)
    if (hexToInt(this.params.fromBlock) >= hexToInt(log.blockNumber)) return false
    if (blockTagIsNumber(this.params.toBlock) && hexToInt(this.params.toBlock) <= hexToInt(log.blockNumber)) return false

    // address is correct:
    // console.log('LogFilter - validateLog - address', this.params.address)
    if (this.params.address && this.params.address !== log.address) return false

    // topics match:
    // topics are position-dependant
    // topics can be nested to represent `or` [[a || b], c]
    // topics can be null, representing a wild card for that position
    // console.log('LogFilter - validateLog - topics', log.topics)
    // console.log('LogFilter - validateLog - against topics', this.params.topics)
    const topicsMatch = this.params.topics.every((topicPattern, index) => {
      // pattern is longer than actual topics
      const logTopic = log.topics[index]
      if (!logTopic) return false
      // wild card
      const subtopicsToMatch = Array.isArray(topicPattern) ? topicPattern : [topicPattern]
      const subtopicsIncludeWildcard = subtopicsToMatch.includes(null)
      if (subtopicsIncludeWildcard) return true
      // check each possible matching topic
      const topicDoesMatch = subtopicsToMatch.includes(logTopic)
      return topicDoesMatch
    })

    // console.log('LogFilter - validateLog - '+(topicsMatch ? 'approved!' : 'denied!')+' ==============')
    return topicsMatch
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
    return hexToInt(refA) - hexToInt(refB)
  })
}

function incrementHexInt(hexString){
  const value = hexToInt(hexString)
  return intToHex(value + 1)
}

function bnToHex(bn) {
  return '0x' + bn.toString(16)
}

function intToHex(int) {
  let hexString = int.toString(16)
  const needsLeftPad = hexString.length % 2
  if (needsLeftPad) hexString = '0' + hexString
  return '0x' + hexString
}

function hexToInt(hexString) {
  return Number.parseInt(hexString, 16)
}

function blockTagIsNumber(blockTag){
  return blockTag && !['earliest', 'latest', 'pending'].includes(blockTag)
}

module.exports = LogFilter
