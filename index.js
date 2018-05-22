const Mutex = require('await-semaphore').Mutex
const EthQuery = require('ethjs-query')
const createAsyncMiddleware = require('json-rpc-engine/src/createAsyncMiddleware')
const createJsonRpcMiddleware = require('eth-json-rpc-middleware/scaffold')
const LogFilter = require('./log-filter.js')
const BlockFilter = require('./block-filter.js')
const TxFilter = require('./tx-filter.js')
const { intToHex, hexToInt } = require('./hexUtils')

module.exports = createEthFilterMiddleware

function createEthFilterMiddleware({ blockTracker, provider }) {

  // ethQuery for log lookups
  const ethQuery = new EthQuery(provider)
  // create filter collection
  let filterIndex = 0
  const filters = {}
  // create update mutex
  const mutex = new Mutex()
  const waitForFree = mutexMiddlewareWrapper({ mutex })

  const middleware = createJsonRpcMiddleware({
    // install filters
    eth_newFilter:                   waitForFree(createAsyncMiddleware(newLogFilter)),
    eth_newBlockFilter:              waitForFree(createAsyncMiddleware(newBlockFilter)),
    eth_newPendingTransactionFilter: waitForFree(createAsyncMiddleware(newPendingTransactionFilter)),
    // uninstall filters
    eth_uninstallFilter:             waitForFree(createAsyncMiddleware(uninstallFilter)),
    // checking filter changes
    eth_getFilterChanges:            waitForFree(createAsyncMiddleware(getFilterChanges)),
    eth_getFilterLogs:               waitForFree(createAsyncMiddleware(getFilterLogs)),
  })

  // setup filter updating and destroy handler
  const filterUpdater = async ({ oldBlock, newBlock }) => {
    if (filters.length === 0) return
    // lock update reads
    const releaseLock = await mutex.acquire()
    try {
      // process all filters in parallel
      await Promise.all(objValues(filters).map(async (filter) => {
        try {
         await filter.update({ oldBlock, newBlock })
        } catch (err) {
          // handle each error individually so filter update errors don't affect other filters
          console.error(err)
        }
      }))
    } catch (err) {
      // log error so we don't skip the releaseLock
      console.error(err)
    }
    // unlock update reads
    releaseLock()
  }

  return middleware

  //
  // new filters
  //

  async function newLogFilter(req, res, next) {
    const params = req.params[0]
    const filter = new LogFilter({ ethQuery, params })
    const filterIndex = await installFilter(filter)
    const result = intToHex(filterIndex)
    res.result = result
  }

  async function newBlockFilter(req, res, next) {
    const filter = new BlockFilter({ ethQuery })
    const filterIndex = await installFilter(filter)
    const result = intToHex(filterIndex)
    res.result = result
  }

  async function newPendingTransactionFilter(req, res, next) {
    const filter = new TxFilter({ ethQuery })
    const filterIndex = await installFilter(filter)
    const result = intToHex(filterIndex)
    res.result = result
  }

  //
  // get filter changes
  //

  async function getFilterChanges(req, res, next) {
    const filterIndexHex = req.params[0]
    const filterIndex = hexToInt(filterIndexHex)
    const filter = filters[filterIndex]
    if (!filter) {
      throw new Error('No filter for index "${filterIndex}"')
    }
    const results = filter.getChangesAndClear()
    res.result = results
  }

  async function getFilterLogs(req, res, next, end) {
    const filterIndexHex = req.params[0]
    const filterIndex = hexToInt(filterIndexHex)
    const filter = filters[filterIndex]
    if (!filter) {
      throw new Error('No filter for index "${filterIndex}"')
    }
    const results = filter.getAllResults()
    res.result = results
  }


  //
  // remove filters
  //


  async function uninstallFilter(req, res, next) {
    const prevFilterCount = objValues(filters).length
    const filterIndexHex = req.params[0]
    // uninstall filter
    const filterIndex = hexToInt(filterIndexHex)
    const filter = filters[filterIndex]
    const results = Boolean(filter)
    delete filters[filterIndex]
    // update block tracker subs
    const newFilterCount = objValues(filters).length
    updateBlockTrackerSubs({ prevFilterCount, newFilterCount })
    res.result = results
  }

  //
  // utils
  //

  async function installFilter(filter) {
    const prevFilterCount = objValues(filters).length
    // install filter
    const currentBlock = await blockTracker.getLatestBlock()
    await filter.initialize({ currentBlock })
    filterIndex++
    filters[filterIndex] = filter
    // update block tracker subs
    const newFilterCount = objValues(filters).length
    updateBlockTrackerSubs({ prevFilterCount, newFilterCount })
    return filterIndex
  }

  function updateBlockTrackerSubs({ prevFilterCount, newFilterCount }) {
    // subscribe
    if (prevFilterCount === 0 && newFilterCount > 0) {
      blockTracker.on('sync', filterUpdater)
      return
    }
    // unsubscribe
    if (prevFilterCount > 0 && newFilterCount === 0) {
      blockTracker.removeListener('sync', filterUpdater)
      return
    }
  }

}

function mutexMiddlewareWrapper({ mutex }) {
  return (middleware) => {
    return async (req, res, next, end) => {
      // wait for mutex available
      // we can release immediately because
      // we just need to make sure updates aren't active
      const releaseLock = await mutex.acquire()
      releaseLock()
      middleware(req, res, next, end)
    }
  }
}

function objValues(obj, fn){
  const values = []
  for (let key in obj) {
    values.push(obj[key])
  }
  return values
}
