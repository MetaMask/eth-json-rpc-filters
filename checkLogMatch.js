function checkLogMatch(filterParams, log) {
  // check if block number in bounds:
  if (blockTagIsNumber(filterParams.fromBlock) && hexToInt(filterParams.fromBlock) >= hexToInt(log.blockNumber)) return false
  if (blockTagIsNumber(filterParams.toBlock) && hexToInt(filterParams.toBlock) <= hexToInt(log.blockNumber)) return false

  // address is correct:
  if (filterParams.address && filterParams.address !== log.address) return false

  // topics match:
  // topics are position-dependant
  // topics can be nested to represent `or` [[a || b], c]
  // topics can be null, representing a wild card for that position
  const topicsMatch = filterParams.topics.every((topicPattern, index) => {
    // wild card
    if (!topicPattern) return true
    // pattern is longer than actual topics
    const logTopic = log.topics[index]
    if (!logTopic) return false
    // check each possible matching topic
    const subtopicsToMatch = Array.isArray(topicPattern) ? topicPattern : [topicPattern]
    const topicDoesMatch = subtopicsToMatch.some((subTopic) => subTopic === logTopic)
    return topicDoesMatch
  })

  return topicsMatch
}
