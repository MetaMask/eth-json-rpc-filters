class BaseFilter {

  constructor () {
    this.updates = []
    this.allResults = []
  }

  addResults (newResults) {
    this.updates = this.updates.concat(newResults)
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