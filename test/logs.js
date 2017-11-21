const test = require('tape')
const LogFilter = require('../log-filter')
const testData0 = require('./data/logs0.json')
const testData1 = require('./data/logs1.json')

test('log filter match 0', (t) => {

  const params = testData0['eth_newFilter-req'].params
  const inputLogs = testData0['eth_getLogs-res'].result

  const filter = new LogFilter({ params })
  const matchingLogs = inputLogs.filter(log => filter.matchLog(log))
  t.equal(inputLogs.length, 2, 'start with two logs')
  t.equal(matchingLogs.length, 2, 'correct number of logs matched')
  t.end()

})

test('log filter match 1', (t) => {

  const params = testData1.params
  const inputLogs = testData1.newLogs

  const filter = new LogFilter({ params })
  const matchingLogs = inputLogs.filter(log => filter.matchLog(log))
  t.equal(inputLogs.length, 2, 'start with two logs')
  t.equal(matchingLogs.length, 0, 'correct number of logs matched')
  t.end()

})