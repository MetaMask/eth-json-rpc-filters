const SafeEventEmitter = require('@metamask/safe-event-emitter').default;

class BaseFilter extends SafeEventEmitter {
  constructor() {
    super();
    this.updates = [];
  }

  async initialize() {
    // do nothing
  }

  async update() {
    throw new Error('BaseFilter - no update method specified');
  }

  addResults(newResults) {
    this.updates = this.updates.concat(newResults);
    newResults.forEach((result) => this.emit('update', result));
  }

  addInitialResults(_newResults) {
    // do nothing
  }

  getChangesAndClear() {
    const { updates } = this;
    this.updates = [];
    return updates;
  }
}

module.exports = BaseFilter;
