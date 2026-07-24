// Seeds a REALISTIC, MOVING factory floor: a five-station production line laid out
// left-to-right, and components that have genuinely TRAVELLED it — each with a
// multi-row scan history, so the Factory Floor map draws real arrows with parts
// visibly flowing along them. One part is flagged AFTER travelling the line, so its
// whole route lights up red and its station pulses. That's the "watch a defect move"
// demo.
//
// Why this replaces the old single-scan seed:
//   The map's arrows come from lib/floorFlows.ts, which only draws an edge when a
//   component is seen at TWO DIFFERENT stations over time. The previous seed wrote
//   exactly one scan per component, so buildFlows found zero moves and the map was a
//   grid of static boxes with nothing connecting them. These journeys fix that at the
//   source: every hop is a status_logs row carrying workstation_id and an increasing
//   timestamp.
//
// Safe to run more than once — it skips any station or component already there, so it
// never double-writes a journey (which would double the arrow counts).
//
//   npm run seed:factory

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { buildFlows, type ScanRow } from '../lib/floorFlows'

// --- env -------------------------------------------------------------------
// tsx doesn't load .env.local the way `next` does, so pull it in ourselves.
// Anything already exported in the real environment takes precedence.
function loadEnv(): Record<string, string> {
  const out: Record<string, string> = { ...(process.env as Record<string, string>) }
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !out[m[1]]) out[m[1]] = m[2].trim()
    }
  } catch {
    // no .env.local — fall back to whatever is already in the environment
  }
  return out
}
const env = loadEnv()

const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment or .env.local.')
  process.exit(1)
}
const supabase = createClient(url, serviceKey)

// --- the floor -------------------------------------------------------------
// A straight five-station line, positioned left-to-right so the arrows read as a real
// production flow. Final Packing is the only is_final_station — without it, nothing in
// the system can ever be marked completed.
const STATIONS = [
  { name: 'Cutting',       location: 'Bay A', is_qa: false, is_final_station: false, pos_x: 80,   pos_y: 320 },
  { name: 'Assembly',      location: 'Bay B', is_qa: false, is_final_station: false, pos_x: 400,  pos_y: 320 },
  { name: 'Welding',       location: 'Bay C', is_qa: false, is_final_station: false, pos_x: 720,  pos_y: 320 },
  { name: 'QA Inspection', location: 'Bay D', is_qa: true,  is_final_station: false, pos_x: 1040, pos_y: 320 },
  { name: 'Final Packing', location: 'Bay E', is_qa: false, is_final_station: true,  pos_x: 1360, pos_y: 320 },
] as const

// --- the parts, and the ROUTE each one actually took -----------------------
// `path` is the ordered list of stations the part was scanned at. `final` is the status
// it's sitting in now (its last scan). Intermediate hops are logged as in_progress;
// only the final hop carries `final`.
type FinalStatus = 'pending' | 'in_progress' | 'completed' | 'flagged'
type Journey = { name: string; path: string[]; final: FinalStatus; dueInHours: number | null }

const JOURNEYS: Journey[] = [
  // finished goods — a clean run all the way down the line. Two of them, so the main
  // artery carries real traffic (thicker, faster-moving dots).
  { name: 'Gearbox-77',    path: ['Cutting', 'Assembly', 'Welding', 'QA Inspection', 'Final Packing'], final: 'completed', dueInHours: 48 },
  { name: 'Gearbox-78',    path: ['Cutting', 'Assembly', 'Welding', 'QA Inspection', 'Final Packing'], final: 'completed', dueInHours: 72 },
  // failed QA once, got routed BACK to Assembly, reworked, and passed. This is what
  // draws the QA -> Assembly rework loop (green, because it was fixed and shipped).
  { name: 'Sensor-Mod-9',  path: ['Cutting', 'Assembly', 'Welding', 'QA Inspection', 'Assembly', 'Welding', 'QA Inspection', 'Final Packing'], final: 'completed', dueInHours: 60 },
  // THE LIVE DEFECT. Travelled the line and is now flagged at QA. Because it's flagged,
  // every edge it touched (Cutting -> Assembly -> Welding -> QA) turns red, and QA pulses.
  { name: 'Housing-A-115', path: ['Cutting', 'Assembly', 'Welding', 'QA Inspection'], final: 'flagged', dueInHours: 12 },
  // healthy, still being worked at Welding.
  { name: 'PCB-Board-001', path: ['Cutting', 'Assembly', 'Welding'], final: 'in_progress', dueInHours: 6 },
  // also at Welding but past its deadline — makes the Welding node glow amber.
  { name: 'Housing-A-114', path: ['Cutting', 'Assembly', 'Welding'], final: 'in_progress', dueInHours: -3 },
  // just moved into Assembly.
  { name: 'PCB-Board-002', path: ['Cutting', 'Assembly'], final: 'in_progress', dueInHours: 30 },
  // sitting at the front of the line, not started.
  { name: 'Sensor-Mod-10', path: ['Cutting'], final: 'pending', dueInHours: null },
]

const WORKER_NAME = 'Demo Worker'
const STEP_MS = 40 * 60 * 1000 // 40 min between scans, so journeys sit in the recent past

function hoursFromNow(hours: number | null) {
  return hours === null ? null : new Date(Date.now() + hours * 3_600_000).toISOString()
}

async function seedStations(): Promise<Map<string, string>> {
  const idByName = new Map<string, string>()

  for (const s of STATIONS) {
    const { data: existing } = await supabase
      .from('workstations')
      .select('id, name')
      .eq('name', s.name)
      .maybeSingle()

    if (existing) {
      idByName.set(existing.name, existing.id)
      console.log(`SKIP  station ${s.name} (already exists)`)
      continue
    }

    const { data, error } = await supabase
      .from('workstations')
      .insert({
        name: s.name,
        location: s.location,
        is_qa: s.is_qa,
        is_final_station: s.is_final_station,
        is_active: true,
        pos_x: s.pos_x,
        pos_y: s.pos_y,
      })
      .select('id, name')
      .single()

    if (error) throw new Error(`station ${s.name}: ${error.message}`)

    idByName.set(data.name, data.id)
    console.log(`OK    station ${s.name}${s.is_final_station ? '  <- final station' : ''}`)
  }

  return idByName
}

async function seedJourneys(stationId: Map<string, string>) {
  for (const j of JOURNEYS) {
    const { data: existing } = await supabase
      .from('components')
      .select('id')
      .eq('name', j.name)
      .maybeSingle()

    if (existing) {
      console.log(`SKIP  component ${j.name} (already exists)`)
      continue
    }

    const lastStation = j.path[j.path.length - 1]
    const lastStationId = stationId.get(lastStation)
    if (!lastStationId) throw new Error(`no station id for ${lastStation}`)

    const now = new Date().toISOString()

    // 1) the CURRENT snapshot — where the part is now + what state it's in
    const { data: comp, error: compErr } = await supabase
      .from('components')
      .insert({
        name: j.name,
        current_status: j.final,
        current_workstation_id: lastStationId,
        current_workstation_name: lastStation,
        last_updated_by: WORKER_NAME,
        deadline: hoursFromNow(j.dueInHours),
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single()

    if (compErr) throw new Error(`component ${j.name}: ${compErr.message}`)

    // 2) the JOURNEY — one status_logs row per hop, each carrying workstation_id and an
    // increasing timestamp. This is the whole point: buildFlows walks these in time
    // order and every station change becomes one arrow on the map.
    const base = Date.now() - (j.path.length - 1) * STEP_MS
    let prevStatus = 'pending'
    const rows = j.path.map((stationName, i) => {
      const toStatus = i === j.path.length - 1 ? j.final : 'in_progress'
      const row = {
        component_id: comp.id,
        component_name: j.name,
        from_status: prevStatus,
        to_status: toStatus,
        workstation_id: stationId.get(stationName)!,
        workstation_name: stationName,
        worker_name: WORKER_NAME,
        timestamp: new Date(base + i * STEP_MS).toISOString(),
      }
      prevStatus = toStatus
      return row
    })

    const { error: logErr } = await supabase.from('status_logs').insert(rows)
    if (logErr) throw new Error(`logs for ${j.name}: ${logErr.message}`)

    console.log(
      `OK    ${j.name.padEnd(14)} ${j.path.join(' -> ')}  [${j.final}]${j.final === 'flagged' ? '  <- DEFECT' : ''}`,
    )
  }
}

// Re-read exactly what the map reads and prove the arrows exist now.
async function verify() {
  const [{ data: comps }, { data: logs }] = await Promise.all([
    supabase.from('components').select('id, current_status'),
    supabase
      .from('status_logs')
      .select('component_id, workstation_id, timestamp')
      .order('timestamp', { ascending: false })
      .limit(500),
  ])

  const flagged = new Set((comps ?? []).filter((c) => c.current_status === 'flagged').map((c) => c.id))
  const flows = buildFlows((logs ?? []) as ScanRow[], flagged)
  console.log(
    `\nMap will now draw ${flows.length} arrows (${flows.filter((f) => f.carriedFlagged).length} red / defect-carrying).`,
  )
}

async function main() {
  const stationIds = await seedStations()
  await seedJourneys(stationIds)
  await verify()
  console.log('\nDone. Open the manager dashboard -> Factory Floor.')
  console.log('Dots should be moving along the arrows, and QA Inspection should be pulsing red.')
}

main().catch((e) => {
  console.error('SEED FAILED:', e.message)
  process.exit(1)
})
