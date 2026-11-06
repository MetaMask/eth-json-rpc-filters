process.on('unhandledRejection', function (err) {
  throw err
})

require('./log-filter.test')
require('./ganache.test')
require('./subscriptions.test')
require('./getBlocksForRange.test')
