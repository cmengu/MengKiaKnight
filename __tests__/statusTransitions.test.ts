// __tests__/statusTransitions.test.ts
//
// The rulebook is pure, so it gets tested properly — no database, no mocks, no
// react. Grouped the way we were taught to think about it: normal cases first
// (equivalence partitions), then the edges, then somebody actively misbehaving.

import {
  legalMoves,
  canTransition,
  assertTransition,
  isComponentStatus,
  COMPONENT_STATUSES,
  STATUS_LABELS,
  type ComponentStatus,
} from '@/lib/services/statusTransitions'

const NORMAL_STATION = false
const FINAL_STATION = true

describe('Status transitions — the happy paths', () => {

  it('lets a worker start work on a pending component', () => {
    expect(canTransition('pending', 'in_progress', NORMAL_STATION)).toBe(true)
  })

  it('sends a component back to pending when it is done at a NON-final station', () => {
    // "done here, next station can grab it"
    expect(canTransition('in_progress', 'pending', NORMAL_STATION)).toBe(true)
  })

  it('lets the final station actually complete a component', () => {
    expect(canTransition('in_progress', 'completed', FINAL_STATION)).toBe(true)
  })

  it('lets a flagged component go back into rework', () => {
    expect(canTransition('flagged', 'in_progress', NORMAL_STATION)).toBe(true)
  })

  it('allows flagging a defect from both pending and in_progress', () => {
    expect(canTransition('pending', 'flagged', NORMAL_STATION)).toBe(true)
    expect(canTransition('in_progress', 'flagged', NORMAL_STATION)).toBe(true)
  })
})

describe('Status transitions — the rule that caused all the confusion', () => {

  // dis is the whole point of the design decision. only the last station on the
  // line gets to say a component is finished.
  it('refuses to complete a component at a normal station', () => {
    expect(canTransition('in_progress', 'completed', NORMAL_STATION)).toBe(false)
  })

  it('explains WHY it refused, instead of a generic error', () => {
    expect(() => assertTransition('in_progress', 'completed', NORMAL_STATION))
      .toThrow(/only the final station/i)
  })

  it('offers "Done Here" at a normal station but "Complete" at the final one', () => {
    const normal = legalMoves('in_progress', NORMAL_STATION)
    const final = legalMoves('in_progress', FINAL_STATION)

    expect(normal.map((m) => m.to)).toEqual(['pending', 'flagged'])
    expect(final.map((m) => m.to)).toEqual(['completed', 'flagged'])
  })
})

describe('Status transitions — dead ends and boundaries', () => {

  it('treats completed as terminal — no moves offered at all', () => {
    expect(legalMoves('completed', NORMAL_STATION)).toEqual([])
    expect(legalMoves('completed', FINAL_STATION)).toEqual([])
  })

  it('tells the worker plainly that a completed component is finished', () => {
    expect(() => assertTransition('completed', 'in_progress', FINAL_STATION))
      .toThrow(/already completed/i)
  })

  it('never lets anything transition to itself', () => {
    for (const status of COMPONENT_STATUSES) {
      expect(canTransition(status, status, NORMAL_STATION)).toBe(false)
      expect(canTransition(status, status, FINAL_STATION)).toBe(false)
    }
  })

  it('does not allow skipping straight from pending to completed', () => {
    // even at the final station — somebody has to actually do the work first
    expect(canTransition('pending', 'completed', FINAL_STATION)).toBe(false)
  })

  it('does not let a flagged component be completed without rework', () => {
    expect(canTransition('flagged', 'completed', FINAL_STATION)).toBe(false)
  })
})

describe('Status transitions — bad input', () => {

  it('rejects statuses that are not real statuses', () => {
    expect(isComponentStatus('in_progress')).toBe(true)
    expect(isComponentStatus('IN_PROGRESS')).toBe(false)   // case matters
    expect(isComponentStatus('done')).toBe(false)
    expect(isComponentStatus('')).toBe(false)
    expect(isComponentStatus('drop table components')).toBe(false)
  })

  it('assertTransition stays quiet when the move is fine', () => {
    expect(() => assertTransition('pending', 'in_progress', NORMAL_STATION)).not.toThrow()
  })

  it('lists the actual alternatives when it rejects a move', () => {
    // a rejection the worker can act on beats a rejection they have to guess at
    expect(() => assertTransition('pending', 'pending', NORMAL_STATION))
      .toThrow(/Start Work/)
  })
})

describe('Status transitions — every move it offers is a move it accepts', () => {

  // catches the class of bug where the dropdown shows an option that the service
  // layer then refuses. these two must never drift apart.
  it.each([
    ['normal station', NORMAL_STATION],
    ['final station', FINAL_STATION],
  ])('stays self-consistent at a %s', (_label, isFinal) => {
    for (const from of COMPONENT_STATUSES) {
      for (const move of legalMoves(from, isFinal)) {
        expect(canTransition(from, move.to, isFinal)).toBe(true)
        expect(() => assertTransition(from, move.to, isFinal)).not.toThrow()
      }
    }
  })

  it('gives every status a human label, so no screen ever shows a raw enum', () => {
    for (const status of COMPONENT_STATUSES) {
      expect(STATUS_LABELS[status as ComponentStatus]).toBeTruthy()
      expect(STATUS_LABELS[status as ComponentStatus]).not.toContain('_')
    }
  })

  it('writes every move in plain english for the worker', () => {
    for (const from of COMPONENT_STATUSES) {
      for (const move of legalMoves(from, FINAL_STATION)) {
        expect(move.label.length).toBeGreaterThan(0)
        expect(move.hint.length).toBeGreaterThan(0)
        expect(move.label).not.toContain('_')
      }
    }
  })
})
