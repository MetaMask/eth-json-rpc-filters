const createJsonRpcMiddleware = require('eth-json-rpc-middleware')
const LogFilter = require('./log-filter.js')

module.exports = createEthFilterMiddleware

function createEthFilterMiddleware({ blockTracker }) {

  let filterIndex = 0
  const filters = {}
  const filterDestroyHandlers = {}
  const asyncBlockHandlers = {}
  const asyncPendingBlockHandlers = {}
  const _ready = new Stoplight()
  const _ready.go()
  const pendingBlockTimeout = opts.pendingBlockTimeout || 4000
  const checkForPendingBlocksActive = false

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

  // new filter
  // new block handler
  function newLogFilter(req, res, next, end) {
    // const filter = new LogFilter(opts)
    // const newLogHandler = filter.update.bind(filter)
    // const newBlockHandler = (block, cb) => {
    //   self._logsForBlock(block, function(err, logs){
    //     if (err) return cb(err)
    //     logs.forEach(newLogHandler)
    //     cb()
    //   })
    // }

    // // register the block handler
    // filterIndex++
    // asyncBlockHandlers[filterIndex] = blockHandler
    // // register the filter
    // const hexFilterIndex = intToHex(filterIndex)
    // filters[hexFilterIndex] = filter
  }

  // new filter
  // new block handler
  // filter destroy handler
  function newBlockFilter(req, res, next, end) {
    // self._getBlockNumber(function(err, blockNumber){
    //   if (err) return cb(err)

    //   var filter = new BlockFilter({
    //     blockNumber: blockNumber,
    //   })

    //   var newBlockHandler = filter.update.bind(filter)
    //   self.engine.on('block', newBlockHandler)
    //   var destroyHandler = function(){
    //     self.engine.removeListener('block', newBlockHandler)
    //   }

    //   self.filterIndex++
    //   var hexFilterIndex = intToHex(self.filterIndex)
    //   self.filters[hexFilterIndex] = filter
    //   self.filterDestroyHandlers[hexFilterIndex] = destroyHandler

    //   cb(null, hexFilterIndex)
    // })
  }

  // new filter
  function newPendingTransactionFilter(req, res, next, end) {
    const self = this

    var filter = new PendingTransactionFilter()
    var newTxHandler = filter.update.bind(filter)
    var blockHandler = function(block, cb){
      self._txHashesForBlock(block, function(err, txs){
        if (err) return cb(err)
        txs.forEach(newTxHandler)
        cb()
      })
    }

    self.filterIndex++
    self.asyncPendingBlockHandlers[self.filterIndex] = blockHandler
    var hexFilterIndex = intToHex(self.filterIndex)
    self.filters[hexFilterIndex] = filter

    cb(null, hexFilterIndex)
  }

  function getFilterChanges(req, res, next, end) {

  }

  function getFilterLogs(req, res, next, end) {

  }

  function uninstallFilter(req, res, next, end) {

  }

  function _installFilter(filter) {
    filterIndex++
    filters.push(filter)
    return filterIndex
  }


}

// install log filter
case 'eth_newFilter':
  self.newLogFilter(payload.params[0], end)
  return

// install block filter
case 'eth_newBlockFilter':
  self.newBlockFilter(end)
  return

// install tx filter
case 'eth_newPendingTransactionFilter':
  self.newPendingTransactionFilter(end)
  self.checkForPendingBlocks()
  return

// check installed filter (any type) for new results
case 'eth_getFilterChanges':
  self._ready.await(function(){
    self.getFilterChanges(payload.params[0], end)
  })
  return

// check installed log filter for all results
case 'eth_getFilterLogs':
  self._ready.await(function(){
    self.getFilterLogs(payload.params[0], end)
  })
  return

// remove installed filter (any type)
case 'eth_uninstallFilter':
  self._ready.await(function(){
    self.uninstallFilter(payload.params[0], end)
  })
  return