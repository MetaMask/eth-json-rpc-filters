const SafeEventEmitter = require('safe-event-emitter')
const createScaffoldMiddleware = require('eth-json-rpc-middleware/scaffold')
const createAsyncMiddleware = require('json-rpc-engine/src/createAsyncMiddleware')
const createFilterMiddleware = require('./index.js')
const { unsafeRandomBytes, incrementHexInt } = require('./hexUtils.js')
const getBlocksForRange = require('./getBlocksForRange.js')

module.exports = createSubscriptionMiddleware


function createSubscriptionMiddleware({ blockTracker, provider }) {
  const filterManager = createFilterMiddleware({ blockTracker, provider })
  const events = new SafeEventEmitter()
  const middleware = createScaffoldMiddleware({
    eth_subscribe: createAsyncMiddleware(subscribe),
    eth_unsubscribe: createAsyncMiddleware(unsubscribe),
  })

  const subscriptions = {}

  return { events, middleware }

  async function subscribe(req, res) {
    const subscriptionType = req.params[0]
    // const filterIdHex = await _createFilter(req)
    // const filterId = Number.parseInt(filterIdHex, 16)
    // subId is 16 byte hex string
    const subId = unsafeRandomBytes(16)

    // create sub
    let sub
    switch (subscriptionType) {
      case 'newHeads':
        sub = createSubNewHeads({ subId })
        break
      case 'logs':
        const filterIdHex = await _createFilter(req)
        sub = createSubFromFilter({ subId, filterIdHex })
        break

    }
    subscriptions[subId] = sub

    // check for subscription updates on new block
    blockTracker.on('sync', sub.update)
    blockTracker.on('sync', ({ oldBlock, newBlock }) => console.log('sub sync', {oldBlock, newBlock}))

    res.result = subId
    return

    function createSubNewHeads({ subId }) {
      const sub = {
        type: subscriptionType,
        // destroy: () => {
        //   blockTracker.removeListener('latest', sub.update)
        //   delete subscriptions[filterId]
        // },
        update: async ({ oldBlock, newBlock }) => {
          // for newHeads
          const toBlock = newBlock
          const fromBlock = incrementHexInt(oldBlock)
          console.log('newHeads update', {fromBlock, toBlock})
          const rawBlocks = await getBlocksForRange({ provider, fromBlock, toBlock })
          const results = rawBlocks.map(normalizeBlock)
          results.forEach((value) => {
            _emitSubscriptionResult(subId, value)
          })
        }
      }
      return sub
    }

    function createSubFromFilter({ subId, filterIdHex }){
      const sub = {
        type: subscriptionType,
        // destroy: () => {
        //   blockTracker.removeListener('latest', sub.update)
        //   delete subscriptions[filterId]
        // },
        update: async () => {
          // check filter for updates
          console.log('filter check start', filterIdHex)
          const results = await filterManager.getFilterChanges({ params: [filterIdHex] })
          console.log('filter check done', filterIdHex, results)
          // emit updates
          results.forEach(async (result) => {
            _emitSubscriptionResult(filterIdHex, subscriptionResult)
          })
        }
      }
      return sub
    }

      // ???
      //   if (subscriptionType === 'newPendingTransactions') {
      //     self.checkForPendingBlocks()
      //   }

  }

  async function unsubscribe(req) {

  }

  function _emitSubscriptionResult(filterIdHex, value) {
    events.emit('notification', {
      jsonrpc: '2.0',
      method: 'eth_subscription',
      params: {
        subscription: filterIdHex,
        result: value,
      },
    })
  }

  async function _createFilter(req) {
    const subscriptionType = req.params[0]

    let filterIdHex

    // identify filter constructor
    switch (subscriptionType) {
      case 'logs':
        filterIdHex = await filterManager.newLogFilter(req)
        break
      case 'newPendingTransactions':
        filterIdHex = await filterManager.newPendingTransactionFilter(req)
        break
      case 'newHeads':
        filterIdHex = await filterManager.newBlockFilter(req)
        break
      default:
        throw new Error(`SubscriptionManager - unsupported subscription type "${subscriptionType}"`)
        return
    }

    return filterIdHex
  }

}

function normalizeBlock(block) {
  return {
    hash: block.hash,
    parentHash: block.parentHash,
    sha3Uncles: block.sha3Uncles,
    miner: block.miner,
    stateRoot: block.stateRoot,
    transactionsRoot: block.transactionsRoot,
    receiptsRoot: block.receiptsRoot,
    logsBloom: block.logsBloom,
    difficulty: block.difficulty,
    number: block.number,
    gasLimit: block.gasLimit,
    gasUsed: block.gasUsed,
    nonce: block.nonce,
    mixHash: block.mixHash,
    timestamp: block.timestamp,
    extraData: block.extraData,
  }
}
