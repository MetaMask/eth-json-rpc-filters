import EventEmitter from 'node:events'
import { PollingBlockTracker } from '@metamask/eth-block-tracker'
import { JsonRpcEngine } from '@metamask/json-rpc-engine'
import { providerAsMiddleware } from '@metamask/eth-json-rpc-middleware'
import { InternalProvider } from '@metamask/eth-json-rpc-provider'
import Ganache from 'ganache'
import createFilterMiddleware from '../src/index.js'
import createSubscriptionMiddleware from '../src/subscriptionManager.js'

export function createTestSetup() {
  // raw data source
  const { ganacheProvider, forceNextBlock } = createEngineFromGanache()
  // create block trackerfilterId
  const blockTracker = new PollingBlockTracker({
    provider: ganacheProvider,
    pollingInterval: 200,
  })
  // create higher level
  const engine = new JsonRpcEngine()
  const provider = new InternalProvider({ engine })
  const request = provider.request.bind(provider);
  // add filter middleware
  engine.push(createFilterMiddleware({ blockTracker, provider }))
  // add subscription middleware
  const subscriptionManager = createSubscriptionMiddleware({ blockTracker, provider })
  engine.push(subscriptionManager.middleware)
  subscriptionManager.events.on('notification', (message) => engine.emit('notification', message))
  // add data source
  engine.push(providerAsMiddleware(ganacheProvider))

  // subs helper
  const subs = createSubsHelper({ provider, engine })

  return { ganacheProvider, forceNextBlock, engine, provider, request, subs, blockTracker, trackNextBlock }

  async function trackNextBlock() {
    return new Promise((resolve) => blockTracker.once('latest', resolve))
  }
}

function createSubsHelper({ provider, engine }) {
  return {
    logs: createSubGenerator({ subType: 'logs', provider, engine }),
    newPendingTransactions: createSubGenerator({ subType: 'newPendingTransactions', provider, engine }),
    newHeads: createSubGenerator({ subType: 'newHeads', provider, engine }),
  }
}

function createSubGenerator({ subType, provider, engine }) {
  return async function () {
    const args = [].slice.call(arguments);
    args.unshift(subType);
    const id = await provider.request({
      method: "eth_subscribe",
      params: args,
    });
    return createNewSub({ id, provider, engine });
  };
}

function createNewSub({ id, provider, engine }) {
  // event emitter for emiting subscription hits
  const events = new EventEmitter()
  // filter rpc notifications for matching subscription
  engine.on('notification', (message) => {
    if (message.method !== 'eth_subscription') return
    const subId = message.params.subscription
    if (subId !== id) return
    const value = message.params.result
    events.emit('notification', value)
  })
  // subscription uninstall method
  async function uninstall() {
    return await provider.request({ method: 'eth_unsubscribe', params: [id] });
  }
  // return custom "subscription" api object
  return {
    id,
    events,
    uninstall,
  }
}

function createEngineFromGanache () {
  const ganacheProvider = Ganache.provider()
  return { ganacheProvider, forceNextBlock }

  async function forceNextBlock() {
    // custom ganache method
    await ganacheProvider.request(createPayload({ method: 'evm_mine' }))
  }
}

export function createPayload(payload) {
  return Object.assign({ id: 1, jsonrpc: '2.0', params: [] }, payload)
}

export function timeout(duration) {
  return new Promise(resolve => setTimeout(resolve, duration))
}


export async function deployLogEchoContract({ tools, from }) {
  // https://github.com/kumavis/eth-needlepoint/blob/master/examples/emit-log.js
  const { request } = tools;
  const deployTxHash = await request({
    method: 'eth_sendTransaction',
    params: [{
      from,
      data: '0x600e600c600039600e6000f336600060003760005160206000a1'
    }]
  })

  await tools.trackNextBlock()
  const deployTxRx = await request({
    method: 'eth_getTransactionReceipt',
    params: [deployTxHash]
  })
  const contractAddress = deployTxRx.contractAddress
  return {
    deployTxHash,
    deployTxRx,
    contractAddress,
  }
}
