process.on('unhandledRejection', function (error) {
  throw error;
});

// This is the way that Tape works.
/* eslint-disable import-x/no-unassigned-import */
require('./logs');
require('./ganache');
require('./subscriptions');
require('./getBlocksForRange');
/* eslint-enable import-x/no-unassigned-import */
