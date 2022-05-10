# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [5.0.0]
### Uncategorized
- Use GitHub Actions instead of CircleCI for automation ([#64](https://github.com/MetaMask/eth-json-rpc-filters/pull/64))
- Bump minimist from 1.2.5 to 1.2.6 ([#59](https://github.com/MetaMask/eth-json-rpc-filters/pull/59))
- Bump cross-fetch from 2.2.3 to 2.2.6 ([#62](https://github.com/MetaMask/eth-json-rpc-filters/pull/62))
- Bump simple-get from 2.8.1 to 2.8.2 ([#63](https://github.com/MetaMask/eth-json-rpc-filters/pull/63))
- Adding handling for null block in getBlocksForRange ([#61](https://github.com/MetaMask/eth-json-rpc-filters/pull/61))
- Bump tar from 4.4.15 to 4.4.19 ([#56](https://github.com/MetaMask/eth-json-rpc-filters/pull/56))
- Bump path-parse from 1.0.6 to 1.0.7 ([#55](https://github.com/MetaMask/eth-json-rpc-filters/pull/55))
- Bump tar from 4.4.13 to 4.4.15 ([#54](https://github.com/MetaMask/eth-json-rpc-filters/pull/54))
- Bump normalize-url from 4.5.0 to 4.5.1 ([#53](https://github.com/MetaMask/eth-json-rpc-filters/pull/53))
- Repo standardization ([#50](https://github.com/MetaMask/eth-json-rpc-filters/pull/50))

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

[Unreleased]: https://github.com/MetaMask/eth-json-rpc-filters/compare/v5.0.0...HEAD
[5.0.0]: https://github.com/MetaMask/eth-json-rpc-filters/compare/v4.2.2...v5.0.0
[4.2.2]: https://github.com/MetaMask/eth-json-rpc-filters/compare/v4.2.1...v4.2.2
[4.2.1]: https://github.com/MetaMask/eth-json-rpc-filters/compare/v4.2.0...v4.2.1
[4.2.0]: https://github.com/MetaMask/eth-json-rpc-filters/releases/tag/v4.2.0
