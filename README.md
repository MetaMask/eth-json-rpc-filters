# `@metamask/eth-json-rpc-filters`

[json-rpc-engine](https://github.com/MetaMask/json-rpc-engine) middleware implementing Ethereum filter methods.
Backed by an [eth-block-tracker](https://github.com/MetaMask/eth-block-tracker) and web3 provider interface (`web3.currentProvider`).

### supported rpc methods
- `eth_newFilter`
- `eth_newBlockFilter`
- `eth_newPendingTransactionFilter`
- `eth_uninstallFilter`
- `eth_getFilterChanges`
- `eth_getFilterLogs`

### usage

basic usage:
```js
const filterMiddleware = createFilterMiddleware({ blockTracker, provider })
engine.push(filterMiddleware)
```

cleanup:
```js
// remove blockTracker handler to free middleware for garbage collection
filterMiddleware.destroy()
```

## Running Tests

```bash
yarn test
```

## Changelog
[`CHANGELOG.md`](./CHANGELOG.md)
