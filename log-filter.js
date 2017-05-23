function LogFilter(opts) {
  const self = this
  self.type = 'log'
  self.fromBlock = opts.fromBlock || 'latest'
  self.toBlock = opts.toBlock || 'latest'
  self.address = opts.address ? normalizeHex(opts.address) : opts.address
  self.topics = opts.topics || []
  self.updates = []
  self.allResults = []
}

LogFilter.prototype.validateLog = function(log){
  const self = this

  // check if block number in bounds:
  if (blockTagIsNumber(self.fromBlock) && hexToInt(self.fromBlock) >= hexToInt(log.blockNumber)) return false
  if (blockTagIsNumber(self.toBlock) && hexToInt(self.toBlock) <= hexToInt(log.blockNumber)) return false

  // address is correct:
  if (self.address && self.address !== log.address) return false

  // topics match:
  // topics are position-dependant
  // topics can be nested to represent `or` [[a || b], c]
  // topics can be null, representing a wild card for that position
  var topicsMatch = self.topics.reduce(function(previousMatched, topicPattern, index){
    // abort in progress
    if (!previousMatched) return false
    // wild card
    if (!topicPattern) return true
    // pattern is longer than actual topics
    var logTopic = log.topics[index]
    if (!logTopic) return false
    // check each possible matching topic
    var subtopicsToMatch = Array.isArray(topicPattern) ? topicPattern : [topicPattern]
    var topicDoesMatch = subtopicsToMatch.filter(function(subTopic){
      return logTopic === subTopic
    }).length > 0
    return topicDoesMatch
  }, true)

  return topicsMatch
}

LogFilter.prototype.update = function(log){
  const self = this
  // validate filter match
  var validated = self.validateLog(log)
  if (!validated) return
  // add to results
  self.updates.push(log)
  self.allResults.push(log)
}

LogFilter.prototype.getChanges = function(){
  const self = this
  var results = self.updates
  return results
}

LogFilter.prototype.getAllResults = function(){
  const self = this
  var results = self.allResults
  return results
}

LogFilter.prototype.clearChanges = function(){
  const self = this
  self.updates = []
}
