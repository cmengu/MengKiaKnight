'use client'
import { useState, useEffect, useActionState } from 'react'
import { supabase } from '@/lib/supabase'
import { createWorkstation } from '@/actions/qr'
import { QrLabel } from './QrLabel'


//literally type a name, click create, the formAction will run the function createWorkstation on the server ->
// ->  DB adds row + UUID -> returns as state created -> useEffect updates the list -> Qr label generates a QR

type Workstation = { id: string; name: string }

export function WorkstationManager() {
  const [list, setList] = useState<Workstation[]>([])
  const [state, formAction, pending] = useActionState(createWorkstation, undefined)

  // firstly load existing workstations once (client-side) oni, fetches the id and name and load intoa  list
  useEffect(() => {
    supabase.from('workstations').select('id, name').then(({ data }) => {
      if (data) setList(data)
    })
  }, [])

  //then when the action returns a new row, show it immediately
  //AND show most recent first
  useEffect(() => {
    if (state?.created) {
      const { id, name } = state.created
      setList((prev) => [{ id, name: name ?? '' }, ...prev])
    }
  }, [state])

  return (
    <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 w-full max-w-2xl">
      <h2 className="text-xl text-white font-bold mb-4">Workstations</h2>

      {/* the form calls server action */}
      <form action={formAction} className="flex gap-2 mb-2">
        <input name="name" placeholder="Station name" required
          className="flex-1 px-3 py-2 rounded bg-slate-700 text-white" />
        <input name="location" placeholder="Location (optional)"
          className="flex-1 px-3 py-2 rounded bg-slate-700 text-white" />
        <button type="submit" disabled={pending}
          className="px-4 py-2 rounded bg-emerald-500 font-semibold text-white disabled:opacity-50">
          {pending ? 'Creating…' : 'Create'}
        </button>
      </form>
      {state?.error && <p className="text-red-400 text-sm mb-4">{state.error}</p>}

      <button onClick={() => window.print()}
          className="mb-4 px-4 py-2 rounded bg-sky-500 font-semibold text-white print:hidden">
          Print all labels
      </button>

      {/* each workstation has a scannable label in STATION:name:uuid format */}
      <div className="grid grid-cols-2 gap-4 mt-4 print:block">
        {list.map((w) => (
          <QrLabel key={w.id} value={`STATION:${w.name}:${w.id}`} caption={w.name} />
        ))}
      </div>
    </div>
  )
}