// Turning raw scan history into the arrows on the factory floor map.
//
// Pure — no supabase, no react. Same reason as statusTransitions and eval/compare:
// dis is the one bit of the floor view with actual logic in it, so it gets to be
// testable on its own.

export type ScanRow = {
  component_id: string
  workstation_id: string | null
  timestamp: string | null
}

export type FloorFlow = {
  id: string
  from: string
  to: string
  count: number
  /** true if any component that took dis route is currently flagged */
  carriedFlagged: boolean
}

/**
 * Work out which routes parts actually take through the factory.
 *
 * For each component we walk its scans in time order. Every time it turns up at a
 * DIFFERENT station than last time, that's one observed move. Tally those and you get
 * the factory's real routing — not a diagram somebody drew once, the actual paths
 * parts took last week.
 *
 * Worth remembering: dis was impossible before the scanner started writing
 * workstation_id. Every log row had a null station, so there were no moves to find and
 * the map would have been empty no matter how good the drawing code was.
 */
export function buildFlows(logs: ScanRow[], flaggedComponentIds: Set<string>): FloorFlow[] {
  const byComponent = new Map<string, ScanRow[]>()

  for (const log of logs) {
    if (!log.workstation_id) continue
    const list = byComponent.get(log.component_id) ?? []
    list.push(log)
    byComponent.set(log.component_id, list)
  }

  const tally = new Map<string, FloorFlow>()

  for (const [componentId, entries] of byComponent) {
    // callers hand these over newest-first, so put them back in walking order
    entries.sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? ''))

    for (let i = 1; i < entries.length; i++) {
      const from = entries[i - 1].workstation_id
      const to = entries[i].workstation_id

      // scanning twice at the same bench isn't a move
      if (!from || !to || from === to) continue

      const id = `${from}->${to}`
      const existing = tally.get(id)

      if (existing) {
        existing.count += 1
        existing.carriedFlagged ||= flaggedComponentIds.has(componentId)
      } else {
        tally.set(id, {
          id,
          from,
          to,
          count: 1,
          carriedFlagged: flaggedComponentIds.has(componentId),
        })
      }
    }
  }

  return [...tally.values()]
}
