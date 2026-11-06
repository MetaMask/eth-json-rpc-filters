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

## Testing changes in other projects using preview builds

Preview builds are published to NPM under the `@metamask-previews` scope, so you can test a pull request in another project before it is released. This follows [core's guide](https://github.com/MetaMask/core/blob/main/docs/processes/preview-builds.md).

### Publishing a preview build

1. Post a comment on the pull request with the text `@metamaskbot publish-preview`. Only MetaMask engineering team members can do this.
2. After a few minutes, a comment appears with the published version, e.g. `@metamask-previews/eth-json-rpc-filters@9.0.0-preview-e2df9b4`.

To publish a new build after pushing more commits, post the comment again.

### Using a preview build

In a MetaMask client repo (e.g. `metamask-extension` or `metamask-mobile`), add an entry to the `previewBuilds` section of `package.json` (create it if it doesn't exist), then run `yarn install`:

```json
"@metamask/eth-json-rpc-filters": {
  "type": "non-breaking",
  "previewVersion": "9.0.0-preview-e2df9b4"
}
```

Use `"type": "breaking"` if the changes are breaking. For other projects, or to override resolutions by hand, see the manual steps in [core's guide](https://github.com/MetaMask/core/blob/main/docs/processes/preview-builds.md#using-preview-builds).
