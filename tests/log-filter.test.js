import { describe, expect, it } from 'vitest'
import LogFilter from '../src/log-filter'
import testData0 from './data/logs0.json'
import testData1 from './data/logs1.json'
import testData2 from './data/logs2.json'
import testData3 from './data/logs3.json'
import testData4 from './data/logs4.json'
import testData5 from './data/logs5.json'
import testData6 from './data/logs6.json'

describe('LogFilter', () => {
  it('matches test data 0', () => {
    const params = testData0['eth_newFilter-req'].params[0]
    const inputLogs = testData0['eth_getLogs-res'].result

    const filter = new LogFilter({ params })
    const matchingLogs = inputLogs.filter(log => filter.matchLog(log))
    expect(inputLogs).toHaveLength(2)
    expect(matchingLogs).toHaveLength(2)
  })

  it('matches test data 1', () => {
    const params = testData1.params
    const inputLogs = testData1.newLogs

    const filter = new LogFilter({ params })
    const matchingLogs = inputLogs.filter(log => filter.matchLog(log))
    expect(inputLogs).toHaveLength(2)
    expect(matchingLogs).toHaveLength(0)
  })

  it('matches test data 2', () => {
    const params = testData2['eth_newFilter-req'].params[0]
    const inputLogs = testData2['eth_getLogs-res'].result

    const filter = new LogFilter({ params })
    const matchingLogs = inputLogs.filter(log => filter.matchLog(log))
    expect(inputLogs).toHaveLength(2)
    expect(matchingLogs).toHaveLength(1)
  })

  it('match case-sensitive', () => {
    const params = testData3['eth_newFilter-req'].params[0]
    const inputLogs = testData3['eth_getLogs-res'].result

    const filter = new LogFilter({ params })
    const matchingLogs = inputLogs.filter(log => filter.matchLog(log))
    expect(inputLogs).toHaveLength(2)
    expect(matchingLogs).toHaveLength(2)
  })

  it('"and" logic', () => {
    const params = testData4.filterParams
    const inputLogs = testData4.inputLogs

    const filter = new LogFilter({ params })
    const matchingLogs = inputLogs.filter(log => filter.matchLog(log))
    expect(inputLogs).toHaveLength(2)
    expect(matchingLogs).toHaveLength(1)
  })

  it('"or" logic', () => {
    const params = testData5.filterParams
    const inputLogs = testData5.inputLogs

    const filter = new LogFilter({ params })
    const matchingLogs = inputLogs.filter(log => filter.matchLog(log))
    expect(inputLogs).toHaveLength(3)
    expect(matchingLogs).toHaveLength(2)
  })

  it('"wildcard" logic', () => {
    const params = testData6.filterParams
    const inputLogs = testData6.inputLogs

    const filter = new LogFilter({ params })
    const matchingLogs = inputLogs.filter(log => filter.matchLog(log))
    expect(inputLogs).toHaveLength(3)
    expect(matchingLogs).toHaveLength(2)
  })
})
