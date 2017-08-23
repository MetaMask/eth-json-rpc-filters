# eth-json-rpc-filters

[json-rpc-engine](https://github.com/kumavis/json-rpc-engine) middleware implementing ethereum filter methods.
Backed by an [eth-block-tracker](https://github.com/MetaMask/eth-block-tracker) and web3 provider interface (`web3.currentProvider`).

### supported rpc methods
- `eth_newFilter`
- `eth_newBlockFilter`
- `eth_newPendingTransactionFilter`
- `eth_uninstallFilter`
- `eth_getFilterChanges`
- `eth_getFilterLogs`

### usage
```
const filterMiddleware = createFilterMiddleware({ blockTracker, provider })
engine.push(filterMiddleware)
```