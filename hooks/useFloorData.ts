'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { buildFlows, type FloorFlow, type ScanRow } from '@/lib/floorFlows'

export type { FloorFlow }

/** A workstation, plus what's actually sitting on it right now. */
export type FloorStation = {
  id: string
  name: string
  location: string | null
  isQa: boolean
  isFinal: boolean
  isActive: boolean
  /** null = never been dragged, so the map auto-places it */
  posX: number | null
  posY: number | null
  total: number
  inProgress: number
  pending: number
  flagged: number
  overdue: number
}

// only present once supabase/floor_view.sql has been run
type RawStation = {
  id: string
  name: string
  location: string | null
  is_qa: boolean
  is_final_station: boolean
  is_active: boolean
  pos_x?: number | null
  pos_y?: number | null
}

type RawComponent = {
  id: string
  current_status: string
  current_workstation_id: string | null
  deadline: string | null
}

// how far back the flow arrows look. plenty for a demo, and keeps the payload small.
const LOG_WINDOW = 500

export function useFloorData() {
  const [stations, setStations] = useState<FloorStation[]>([])
  const [flows, setFlows] = useState<FloorFlow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** false until we've proven the pos_x/pos_y columns exist */
  const [canPersist, setCanPersist] = useState(true)
  const [isLive, setIsLive] = useState(false)

  // stops a burst of realtime events kicking off five overlapping refetches
  const refetching = useRef(false)

  const load = useCallback(async () => {
    if (refetching.current) return
    refetching.current = true

    try {
      const [stationRes, componentRes, logRes] = await Promise.all([
        // select('*') on purpose — asking for pos_x by name would hard-error on a
        // database that hasn't run the migration yet, and we'd rather degrade
        supabase.from('workstations').select('*'),
        supabase.from('components').select('id, current_status, current_workstation_id, deadline'),
        supabase
          .from('status_logs')
          .select('component_id, workstation_id, timestamp')
          .order('timestamp', { ascending: false })
          .limit(LOG_WINDOW),
      ])

      if (stationRes.error) throw new Error(stationRes.error.message)
      if (componentRes.error) throw new Error(componentRes.error.message)
      if (logRes.error) throw new Error(logRes.error.message)

      const rawStations = (stationRes.data ?? []) as unknown as RawStation[]
      const components = (componentRes.data ?? []) as unknown as RawComponent[]
      const logs = (logRes.data ?? []) as unknown as ScanRow[]

      // if the migration hasn't been run these come back undefined, and saving a
      // dragged layout would silently do nothing — so say so in the ui instead
      setCanPersist(rawStations.length === 0 || rawStations.some((s) => 'pos_x' in s))

      const now = Date.now()
      const flaggedIds = new Set(
        components.filter((c) => c.current_status === 'flagged').map((c) => c.id),
      )

      setStations(
        rawStations.map((s) => {
          const here = components.filter((c) => c.current_workstation_id === s.id)
          return {
            id: s.id,
            name: s.name,
            location: s.location,
            isQa: s.is_qa,
            isFinal: s.is_final_station,
            isActive: s.is_active,
            posX: s.pos_x ?? null,
            posY: s.pos_y ?? null,
            total: here.length,
            inProgress: here.filter((c) => c.current_status === 'in_progress').length,
            pending: here.filter((c) => c.current_status === 'pending').length,
            flagged: here.filter((c) => c.current_status === 'flagged').length,
            overdue: here.filter(
              (c) =>
                c.deadline !== null &&
                Date.parse(c.deadline) < now &&
                c.current_status !== 'completed',
            ).length,
          }
        }),
      )

      setFlows(buildFlows(logs, flaggedIds))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the factory floor.')
    } finally {
      setIsLoading(false)
      refetching.current = false
    }
  }, [])

  // TODO(tech-debt): same fetch-on-mount pattern as the manager components. The real
  // fix is server-side loading or a query lib — grandfathered so the rule stays an
  // ERROR for new code. (The realtime subscription below is a legit effect though:
  // that IS synchronising with an external system, which is what effects are for.)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()

    // live updates. if realtime isn't switched on for these tables the subscription
    // just never fires — the map still works, it only stops updating by itself.
    const channel = supabase
      .channel('floor-view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'components' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'status_logs' }, () => load())
      .subscribe((status) => setIsLive(status === 'SUBSCRIBED'))

    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  /** Remember where the manager dropped a station. No-op if the migration hasn't run. */
  const savePosition = useCallback(
    async (id: string, x: number, y: number) => {
      // keep the local copy in step immediately so the node doesn't spring back
      setStations((prev) => prev.map((s) => (s.id === id ? { ...s, posX: x, posY: y } : s)))

      const { error: saveError } = await supabase
        .from('workstations')
        // cast: pos_x/pos_y aren't in the generated types until someone regenerates them
        .update({ pos_x: x, pos_y: y } as never)
        .eq('id', id)

      if (saveError) setCanPersist(false)
    },
    [],
  )

  return { stations, flows, isLoading, error, canPersist, isLive, reload: load, savePosition }
}
