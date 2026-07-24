// __tests__/floorFlows.test.ts
//
// The arrows on the factory floor map are derived, not stored — so the derivation is
// the thing worth testing. Everything here is plain data in, plain data out.

import { buildFlows, type ScanRow } from '@/lib/floorFlows'

const NONE = new Set<string>()

// helper so the cases below read like a story instead of a wall of object literals
function scan(component: string, station: string | null, time: string): ScanRow {
  return { component_id: component, workstation_id: station, timestamp: time }
}

describe('buildFlows — reading routes out of scan history', () => {

  it('turns two scans of one component into one route', () => {
    const flows = buildFlows(
      [scan('c1', 'cutting', '2026-07-19T09:00:00Z'), scan('c1', 'welding', '2026-07-19T10:00:00Z')],
      NONE,
    )

    expect(flows).toHaveLength(1)
    expect(flows[0]).toMatchObject({ from: 'cutting', to: 'welding', count: 1 })
  })

  it('follows a component the whole way down the line', () => {
    const flows = buildFlows(
      [
        scan('c1', 'cutting', '2026-07-19T09:00:00Z'),
        scan('c1', 'welding', '2026-07-19T10:00:00Z'),
        scan('c1', 'packing', '2026-07-19T11:00:00Z'),
      ],
      NONE,
    )

    expect(flows.map((f) => f.id)).toEqual(['cutting->welding', 'welding->packing'])
  })

  it('adds up when several components take the same route', () => {
    const flows = buildFlows(
      [
        scan('c1', 'cutting', '2026-07-19T09:00:00Z'),
        scan('c1', 'welding', '2026-07-19T10:00:00Z'),
        scan('c2', 'cutting', '2026-07-19T09:30:00Z'),
        scan('c2', 'welding', '2026-07-19T10:30:00Z'),
      ],
      NONE,
    )

    expect(flows).toHaveLength(1)
    expect(flows[0].count).toBe(2)
  })

  it('sorts by time, so rows arriving newest-first still read correctly', () => {
    // supabase hands them back descending — dis is the order the hook actually gets
    const flows = buildFlows(
      [scan('c1', 'welding', '2026-07-19T10:00:00Z'), scan('c1', 'cutting', '2026-07-19T09:00:00Z')],
      NONE,
    )

    expect(flows[0]).toMatchObject({ from: 'cutting', to: 'welding' })
  })

  it('never crosses components — two parts do not make a route between them', () => {
    const flows = buildFlows(
      [scan('c1', 'cutting', '2026-07-19T09:00:00Z'), scan('c2', 'welding', '2026-07-19T10:00:00Z')],
      NONE,
    )

    expect(flows).toEqual([])
  })
})

describe('buildFlows — the things that should NOT become arrows', () => {

  it('ignores a rescan at the same bench', () => {
    const flows = buildFlows(
      [scan('c1', 'cutting', '2026-07-19T09:00:00Z'), scan('c1', 'cutting', '2026-07-19T09:05:00Z')],
      NONE,
    )

    expect(flows).toEqual([])
  })

  // dis is exactly what every log row looked like before the scanner was fixed
  it('produces nothing at all from logs with no workstation_id', () => {
    const flows = buildFlows(
      [scan('c1', null, '2026-07-19T09:00:00Z'), scan('c1', null, '2026-07-19T10:00:00Z')],
      NONE,
    )

    expect(flows).toEqual([])
  })

  it('skips over the null rows and still joins up the real ones', () => {
    const flows = buildFlows(
      [
        scan('c1', 'cutting', '2026-07-19T09:00:00Z'),
        scan('c1', null, '2026-07-19T09:30:00Z'),      // manager override, no station
        scan('c1', 'welding', '2026-07-19T10:00:00Z'),
      ],
      NONE,
    )

    expect(flows).toHaveLength(1)
    expect(flows[0]).toMatchObject({ from: 'cutting', to: 'welding' })
  })

  it('copes with an empty history', () => {
    expect(buildFlows([], NONE)).toEqual([])
  })

  it('copes with a single lonely scan', () => {
    expect(buildFlows([scan('c1', 'cutting', '2026-07-19T09:00:00Z')], NONE)).toEqual([])
  })
})

describe('buildFlows — showing where trouble travelled', () => {

  it('marks a route red when a flagged component took it', () => {
    const flows = buildFlows(
      [scan('c1', 'cutting', '2026-07-19T09:00:00Z'), scan('c1', 'welding', '2026-07-19T10:00:00Z')],
      new Set(['c1']),
    )

    expect(flows[0].carriedFlagged).toBe(true)
  })

  it('leaves a route alone when nothing on it is flagged', () => {
    const flows = buildFlows(
      [scan('c1', 'cutting', '2026-07-19T09:00:00Z'), scan('c1', 'welding', '2026-07-19T10:00:00Z')],
      new Set(['some-other-component']),
    )

    expect(flows[0].carriedFlagged).toBe(false)
  })

  it('one bad part is enough to mark a shared route', () => {
    // the route is busy and mostly fine, but a defect came dis way — say so
    const flows = buildFlows(
      [
        scan('good', 'cutting', '2026-07-19T09:00:00Z'),
        scan('good', 'welding', '2026-07-19T10:00:00Z'),
        scan('bad', 'cutting', '2026-07-19T09:30:00Z'),
        scan('bad', 'welding', '2026-07-19T10:30:00Z'),
      ],
      new Set(['bad']),
    )

    expect(flows).toHaveLength(1)
    expect(flows[0].count).toBe(2)
    expect(flows[0].carriedFlagged).toBe(true)
  })
})
