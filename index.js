const EthQuery = require('ethjs-query')
const createJsonRpcMiddleware = require('eth-json-rpc-middleware/scaffold')
const waitForBlock = require('eth-json-rpc-middleware/waitForBlock')
const LogFilter = require('./log-filter.js')
const BlockFilter = require('./block-filter.js')
const TxFilter = require('./tx-filter.js')
const checkLogMatch = require('./checkLogMatch.js')

module.exports = createEthFilterMiddleware

function createEthFilterMiddleware({ blockTracker, provider }) {

  let filterIndex = 0
  const filters = {}

  const ethQuery = new Eth(provider)

  blockTracker.on('sync', async ({ oldBlock, newBlock }) => {
    // lock update reads
    // process all filters in parallel
    await Promise.all(objValues(filters).map((filter) => {
      return filter.update({ oldBlock, newBlock })
    }))
    // unlock update reads
  })

  return createJsonRpcMiddleware({
    // install filters
    eth_newFilter:                   newLogFilter,
    eth_newBlockFilter:              newBlockFilter,
    eth_newPendingTransactionFilter: newPendingTransactionFilter,
    // uninstall filters
    eth_uninstallFilter:             uninstallFilter,
    // checking filter changes
    eth_getFilterChanges:            getFilterChanges,
    eth_getFilterLogs:               getFilterLogs,
  })

  //
  // new filters
  //

  function newLogFilter(req, res, next, end) {
    const params = req.params[0]
    const filter = new LogFilter({ ethQuery, params })
    const filterIndex = installFilter(filter)
    const result = intToHex(filterIndex)
    res.result = result
    end()
  }

  function newBlockFilter(req, res, next, end) {
    const filter = new BlockFilter({ ethQuery })
    const filterIndex = installFilter(filter)
    const result = intToHex(filterIndex)
    res.result = result
    end()
  }

  function newPendingTransactionFilter(req, res, next, end) {
    const filter = new TxFilter({ ethQuery })
    const filterIndex = installFilter(filter)
    const result = intToHex(filterIndex)
    res.result = result
    end()
  }

  //
  // get filter changes
  //

  function getFilterChanges(req, res, next, end) {
    const filterIndexHex = req.params[0]
    const filterIndex = hexToInt(filterIndexHex)
    const filter = filters[filterIndex]
    if (!filter) {
      const err = new Error('No filter for index "${filterIndex}"')
      return end(err)
    }
    const results = filter.getChangesAndClear()
    res.results = results
    end()
  }

  function getFilterLogs(req, res, next, end) {
    const filterIndexHex = req.params[0]
    const filterIndex = hexToInt(filterIndexHex)
    const filter = filters[filterIndex]
    if (!filter) {
      const err = new Error('No filter for index "${filterIndex}"')
      return end(err)
    }
    const results = filter.getAllResults()
    res.results = results
    end()
  }


  //
  // remove filters
  //


  function uninstallFilter(req, res, next, end) {
    const filterIndexHex = req.params[0]
    const filterIndex = hexToInt(filterIndexHex)
    const filter = filters[filterIndex]
    const results = Boolean(filter)
    delete filters[filterIndex]
    res.results = results
    end()
  }

  //
  // utils
  //

  function installFilter(filter) {
    filterIndex++
    filters[filterIndex] = filter
    return filterIndex
  }

}

function objValues(obj, fn){
  const values = []
  for (let key in obj) {
    values.push(obj[key])
  }
  return values
}

function intToHex(int) {
  return '0x' + int.toString(16)
}

function hexToInt(hex) {
  return Number.parseInt(hex, 16)
}
