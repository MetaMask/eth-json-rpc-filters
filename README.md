# `@metamask/eth-json-rpc-filters`

<table><tr><td><p align="center"><b>⚠️ PLEASE READ ⚠️</b></p><p align="center">This package is currently being migrated to our <a href="https://github.com/MetaMask/core"><code>core</code></a> monorepo. Please do not make any commits to this repository while this migration is taking place, as they will not be transferred over. Also, please re-open PRs that are under active development in the core repo.</p></td></tr></table>

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
