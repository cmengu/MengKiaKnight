// __tests__/evalCompare.test.ts
//
// Testing the test harness. Sounds silly until you remember the old one scored a
// broken database at 100% on the questions it broke — a scoreboard you can't trust
// is worse than no scoreboard, so the scoring logic gets tests of its own.

import { normVal, rowCovers, matches, judge } from '@/eval/compare'

describe('normVal — same value, different spelling', () => {

  it('treats numbers the same however they arrive', () => {
    expect(normVal(4)).toBe(normVal('4'))
    expect(normVal('4.00')).toBe(normVal(4))
    expect(normVal(' 4 ')).toBe(normVal(4))
  })

  it('treats the same instant the same however postgres spells it', () => {
    // dis exact mismatch cost real marks in the last eval run
    expect(normVal('2026-07-19 10:00:00+00')).toBe(normVal('2026-07-19T10:00:00.000Z'))
  })

  it('does not mistake ordinary text for a date', () => {
    expect(normVal('Assembly')).toBe('s:Assembly')
    expect(normVal('PCB-Board-001')).toBe('s:PCB-Board-001')
  })

  it('folds null, undefined and empty string together', () => {
    expect(normVal(null)).toBe(normVal(undefined))
    expect(normVal('')).toBe(normVal(null))
  })

  it('keeps genuinely different values apart', () => {
    expect(normVal(4)).not.toBe(normVal(5))
    expect(normVal('Assembly')).not.toBe(normVal('Welding'))
    expect(normVal(0)).not.toBe(normVal(null))   // zero is not nothing
  })
})

describe('rowCovers — extra columns are forgiven, missing ones are not', () => {

  it('accepts an answer carrying extra columns', () => {
    // asked "which components are flagged", model also returned the id. still correct.
    expect(rowCovers({ name: 'PCB-1', id: 'abc' }, { name: 'PCB-1' })).toBe(true)
  })

  it('rejects an answer missing a column that was asked for', () => {
    expect(rowCovers({ name: 'PCB-1' }, { name: 'PCB-1', status: 'flagged' })).toBe(false)
  })

  it('ignores column names and column order', () => {
    expect(rowCovers({ total: 4 }, { count: 4 })).toBe(true)
    expect(rowCovers({ a: 1, b: 2 }, { x: 2, y: 1 })).toBe(true)
  })

  it('needs two 5s to satisfy two wanted 5s', () => {
    expect(rowCovers({ a: 5, b: 9 }, { x: 5, y: 5 })).toBe(false)
    expect(rowCovers({ a: 5, b: 5 }, { x: 5, y: 5 })).toBe(true)
  })
})

describe('matches — row counts stay strict', () => {

  it('accepts the same rows in a different order', () => {
    const got = [{ name: 'B' }, { name: 'A' }]
    const want = [{ name: 'A' }, { name: 'B' }]
    expect(matches(got, want)).toBe(true)
  })

  it('rejects an answer with too many rows', () => {
    expect(matches([{ n: 'A' }, { n: 'B' }], [{ n: 'A' }])).toBe(false)
  })

  it('rejects an answer with too few rows', () => {
    expect(matches([{ n: 'A' }], [{ n: 'A' }, { n: 'B' }])).toBe(false)
  })

  it('rejects right shape but wrong values', () => {
    expect(matches([{ n: 'A' }], [{ n: 'B' }])).toBe(false)
  })

  it('handles a single scalar count row', () => {
    expect(matches([{ count: 4 }], [{ count: '4' }])).toBe(true)
  })
})

describe('judge — the self-deception guard', () => {

  // THE regression test for dis whole branch. The old harness said two empty results
  // matched, so every question broken by the missing foreign key scored as a pass.
  it('does NOT call two empty results a pass', () => {
    expect(judge([], [])).toBe('EMPTY')
  })

  it('flags an empty expectation as EMPTY even when the model returned rows', () => {
    expect(judge([{ name: 'A' }], [])).toBe('EMPTY')
  })

  it('still passes a genuine match', () => {
    expect(judge([{ count: 3 }], [{ count: 3 }])).toBe('PASS')
  })

  it('still fails a genuine mismatch', () => {
    expect(judge([{ count: 3 }], [{ count: 4 }])).toBe('FAIL')
  })

  it('fails when the model returns nothing but there was something to find', () => {
    expect(judge([], [{ name: 'A' }])).toBe('FAIL')
  })
})
