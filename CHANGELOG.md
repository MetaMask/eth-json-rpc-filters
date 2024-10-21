# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [9.0.1]
### Uncategorized
- build(deps-dev): bump @metamask/eth-json-rpc-middleware ([#197](https://github.com/MetaMask/eth-json-rpc-filters/pull/197))

## [9.0.0]
### Changed
- **BREAKING:** Adapt to EIP-1193 provider changes by replacing the deprecated `sendAsync` method with the `request` method ([#170](https://github.com/MetaMask/eth-json-rpc-filters/pull/170))

### Fixed
- Bump `@metamask/json-rpc-engine` from `^9.0.0` to `^10.0.0` ([#194](https://github.com/MetaMask/eth-json-rpc-filters/pull/194))

## [8.0.0]
### Changed
- BREAKING: Drop support for Node.js v16, v21 ([#164](https://github.com/MetaMask/eth-json-rpc-filters/pull/164))
- Update `@metamask/json-rpc-engine` from `^8.0.2` to `^9.0.0` ([#165](https://github.com/MetaMask/eth-json-rpc-filters/pull/165))

## [7.0.1]
### Changed
- yarn version 1.22.22 declared as packageManager in package.json ([#156](https://github.com/MetaMask/eth-json-rpc-filters/pull/156))
- Bump `@metamask/eth-query` from `^3.0.1` to `^4.0.0` ([#126](https://github.com/MetaMask/eth-json-rpc-filters/pull/126))
- Bump `@metamask/json-rpc-engine` from `^7.1.0` to `^8.0.2` ([#162](https://github.com/MetaMask/eth-json-rpc-filters/pull/162))

### Fixed
- Bump `async-mutex` from `^0.2.6` to `^0.5.0` ([#163](https://github.com/MetaMask/eth-json-rpc-filters/pull/163))

## [7.0.0]
### Changed
- **BREAKING:** Set minimum Node.js version to v16 ([#102](https://github.com/MetaMask/eth-json-rpc-filters/pull/102))
- **BREAKING:** Rename package from `eth-json-rpc-filters` to `@metamask/eth-json-rpc-filters` ([#103](https://github.com/MetaMask/eth-json-rpc-filters/pull/103))
- Bump `@metamask/json-rpc-engine` from `^6.0.0` to `^7.1.0` ([#104](https://github.com/MetaMask/eth-json-rpc-filters/pull/104))
- Replace `@metamask/eth-query`@`^2.1.2` with `@metamask/eth-query`@`^3.0.1` ([#107](https://github.com/MetaMask/eth-json-rpc-filters/pull/107))

## [6.0.1]
### Changed
- Bump `@metamask/safe-event-emitter` from `^2.0.0` to `^3.0.0` ([#94](https://github.com/MetaMask/eth-json-rpc-filters/pull/94))

## [6.0.0]
### Changed
- **BREAKING:** Block filter middleware will not throw an error if a block is not found ([#89](https://github.com/MetaMask/eth-json-rpc-filters/pull/89))

## [5.1.0]
### Changed
- Remove `eth-json-rpc-middleware` dependency ([#76](https://github.com/MetaMask/eth-json-rpc-filters/pull/76))
  - This package is still used in tests as a `devDependency`, but it's not used in the published package anymore.

### Fixed
- Fix `eth_getFilterLogs` ([#84](https://github.com/MetaMask/eth-json-rpc-filters/pull/84))
- Fix for null reference exception when normalizing the block ([#83](https://github.com/MetaMask/eth-json-rpc-filters/pull/83))

## [5.0.0] - 2022-05-10
### Added
- Add retry logic to `getBlocksForRange`, treating a null block number as failure ([#61](https://github.com/MetaMask/eth-json-rpc-filters/pull/61))

### Changed
- **BREAKING:** Set minimum Node.js version to v12 ([#50](https://github.com/MetaMask/eth-json-rpc-filters/pull/50))
  - We officially support Node 12, 14, and 16, in alignment with our other packages.

## [4.2.2] - 2021-02-04
### Changed
- Replace `await-semaphore` with `async-mutex` ([#33](https://github.com/MetaMask/eth-json-rpc-filters/pull/33))
- Move `pify` to production dependencies and update to v5 ([#39](https://github.com/MetaMask/eth-json-rpc-filters/pull/39) and [#40](https://github.com/MetaMask/eth-json-rpc-filters/pull/40))
- Cleanup manifest metadata ([#43](https://github.com/MetaMask/eth-json-rpc-filters/pull/43) and [#42](https://github.com/MetaMask/eth-json-rpc-filters/pull/42))
- Update `json-rpc-engine` from v5 to v6 ([#35](https://github.com/MetaMask/eth-json-rpc-filters/pull/35))
- Update to `@metamask/safe-event-emitter` v2 ([#37](https://github.com/MetaMask/eth-json-rpc-filters/pull/37))
- Remove `lodash.flatmap` dependency ([#36](https://github.com/MetaMask/eth-json-rpc-filters/pull/36))

## [4.2.1] - 2020-09-22
### Changed
- Specify publish files ([#30](https://github.com/MetaMask/eth-json-rpc-filters/pull/30))

## [4.2.0] - 2020-09-22
### Changed
- Update RPC packages ([#29](https://github.com/MetaMask/eth-json-rpc-filters/pull/29))
  - `json-rpc-engine@5.3.0`
  - `eth-json-rpc-middleware@6.0.0`

## [3.0.1] - 2018-10-08
### Changed
- **BREAKING**: `BaseFilter` now extends `SafeEventEmitter` (c583ba9d9410ca7c861282b0a122212b7c22ba47)

## [2.0.0] - 2018-05-22
### Changed
- **BREAKING**: expect EthBlockTracker@4 (062fd0849631a9862780c0591a3987bcadfe880f)

[Unreleased]: https://github.com/MetaMask/eth-json-rpc-filters/compare/v9.0.1...HEAD
[9.0.1]: https://github.com/MetaMask/eth-json-rpc-filters/compare/v9.0.0...v9.0.1
[9.0.0]: https://github.com/MetaMask/eth-json-rpc-filters/compare/v8.0.0...v9.0.0
[8.0.0]: https://github.com/MetaMask/eth-json-rpc-filters/compare/v7.0.1...v8.0.0
[7.0.1]: https://github.com/MetaMask/eth-json-rpc-filters/compare/v7.0.0...v7.0.1
[7.0.0]: https://github.com/MetaMask/eth-json-rpc-filters/compare/v6.0.1...v7.0.0
[6.0.1]: https://github.com/MetaMask/eth-json-rpc-filters/compare/v6.0.0...v6.0.1
[6.0.0]: https://github.com/MetaMask/eth-json-rpc-filters/compare/v5.1.0...v6.0.0
[5.1.0]: https://github.com/MetaMask/eth-json-rpc-filters/compare/v5.0.0...v5.1.0
[5.0.0]: https://github.com/MetaMask/eth-json-rpc-filters/compare/v4.2.2...v5.0.0
[4.2.2]: https://github.com/MetaMask/eth-json-rpc-filters/compare/v4.2.1...v4.2.2
[4.2.1]: https://github.com/MetaMask/eth-json-rpc-filters/compare/v4.2.0...v4.2.1
[4.2.0]: https://github.com/MetaMask/eth-json-rpc-filters/compare/v3.0.1...v4.2.0
[3.0.1]: https://github.com/MetaMask/eth-json-rpc-filters/compare/v2.0.0...v3.0.1
[2.0.0]: https://github.com/MetaMask/eth-json-rpc-filters/releases/tag/v2.0.0
