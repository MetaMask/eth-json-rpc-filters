class BaseFilter {

  constructor () {
    this.updates = []
    this.allResults = []
  }

  async initialize () {}

  async update () {
    throw new Error('BaseFilter - no update method specified')
  }

  addResults (newResults) {
    this.updates = this.updates.concat(newResults)
    this.allResults = this.allResults.concat(newResults)
  }

  addInitialResults (newResults) {
    this.allResults = this.allResults.concat(newResults)
  }

  getChangesAndClear () {
    const updates = this.updates
    this.updates = []
    return updates
  }

  getAllResults () {
    return this.allResults
  }

}

module.exports = BaseFilter