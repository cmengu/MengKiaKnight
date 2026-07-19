// Seeds a small but REALISTIC factory: a few stations (one of them flagged as the
// end of the line) and components spread across all four statuses, each with a
// matching audit-trail row.
//
// Why bother when seed-demo already exists:
//   1. Under our rules only a station with is_final_station = true can complete
//      anything. If no station has that flag, "Completed" is unreachable. Dis
//      script guarantees there's one.
//   2. The dashboard's "Completed Today" and "Flagged" tiles were permanently 0
//      because those statuses never got written. Now they have real data to show.
//   3. Every status_logs row here carries workstation_id, so the chatbot's joins
//      finally return rows instead of nothing.
//
// Safe to run more than once — it skips anything already there.
//
//   npm run seed:factory

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const STATIONS = [
  { name: 'Cutting',      location: 'Bay A', is_qa: false, is_final_station: false },
  { name: 'Assembly',     location: 'Bay B', is_qa: false, is_final_station: false },
  { name: 'Welding',      location: 'Bay C', is_qa: false, is_final_station: false },
  { name: 'QA Inspection', location: 'Bay D', is_qa: true,  is_final_station: false },
  // the one that matters — without dis, nothing can ever be marked completed
  { name: 'Final Packing', location: 'Bay E', is_qa: false, is_final_station: true },
] as const

// deliberately spread across all four statuses so every dashboard tile and every
// filter tab has something in it
const COMPONENTS = [
  { name: 'PCB-Board-001', station: 'Assembly',      status: 'in_progress', dueInHours: 6 },
  { name: 'PCB-Board-002', station: 'Cutting',       status: 'pending',     dueInHours: 30 },
  { name: 'Housing-A-114', station: 'Welding',       status: 'in_progress', dueInHours: -3 }, // overdue on purpose
  { name: 'Housing-A-115', station: 'QA Inspection', status: 'flagged',     dueInHours: 12 },
  { name: 'Gearbox-77',    station: 'Final Packing', status: 'completed',   dueInHours: 48 },
  { name: 'Gearbox-78',    station: 'Final Packing', status: 'completed',   dueInHours: 72 },
  { name: 'Sensor-Mod-9',  station: 'QA Inspection', status: 'flagged',     dueInHours: 4 },
  { name: 'Sensor-Mod-10', station: 'Cutting',       status: 'pending',     dueInHours: null },
] as const

const WORKER_NAME = 'Demo Worker'

function hoursFromNow(hours: number | null) {
  if (hours === null) return null
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

async function seedStations() {
  const byName = new Map<string, string>()

  for (const station of STATIONS) {
    const { data: existing } = await supabase
      .from('workstations')
      .select('id, name')
      .eq('name', station.name)
      .maybeSingle()

    if (existing) {
      byName.set(existing.name, existing.id)
      console.log(`SKIP  station ${station.name} (already exists)`)
      continue
    }

    const { data, error } = await supabase
      .from('workstations')
      .insert({ ...station, is_active: true })
      .select('id, name')
      .single()

    if (error) throw new Error(`station ${station.name}: ${error.message}`)

    byName.set(data.name, data.id)
    console.log(`OK    station ${station.name}${station.is_final_station ? '  <- final station' : ''}`)
  }

  return byName
}

async function seedComponents(stationIds: Map<string, string>) {
  for (const item of COMPONENTS) {
    const stationId = stationIds.get(item.station)
    if (!stationId) throw new Error(`no station id for ${item.station}`)

    const { data: existing } = await supabase
      .from('components')
      .select('id')
      .eq('name', item.name)
      .maybeSingle()

    if (existing) {
      console.log(`SKIP  component ${item.name} (already exists)`)
      continue
    }

    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('components')
      .insert({
        name: item.name,
        current_status: item.status,
        current_workstation_id: stationId,
        current_workstation_name: item.station,
        last_updated_by: WORKER_NAME,
        deadline: hoursFromNow(item.dueInHours),
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single()

    if (error) throw new Error(`component ${item.name}: ${error.message}`)

    // the matching audit row. workstation_id is the whole point — dis is the column
    // the chatbot joins on, and it was never being written by the scanner.
    const { error: logError } = await supabase
      .from('status_logs')
      .insert({
        component_id: data.id,
        component_name: item.name,
        from_status: 'pending',
        to_status: item.status,
        workstation_id: stationId,
        workstation_name: item.station,
        worker_name: WORKER_NAME,
      })

    if (logError) throw new Error(`log for ${item.name}: ${logError.message}`)

    console.log(`OK    component ${item.name} (${item.status} @ ${item.station})`)
  }
}

async function main() {
  const stationIds = await seedStations()
  await seedComponents(stationIds)
  console.log('\nDone. Final station is "Final Packing" — scan that one to complete anything.')
}

main()
