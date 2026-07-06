'use client'
import { useState, useEffect, useActionState } from 'react'
import { supabase } from '@/lib/supabase'
import { createWorkstation } from '@/actions/qr'
import { QrLabel } from './QrLabel'


//literally type a name, click create, the formAction will run the function createWorkstation on the server ->
// ->  DB adds row + UUID -> returns as state created -> useEffect updates the list -> Qr label generates a QR

type Workstation = { id: string; name: string }

interface QrWorkstationGeneratorProps {
  preSelectedItem?: { id: string, name: string } | null;
  onClearTarget: () => void;
}

export function QrWorkstationGenerator({ preSelectedItem, onClearTarget }: QrWorkstationGeneratorProps) {
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

  // If Bridge sent data, show only that ONE item. Otherwise show whole list
  const displayList = preSelectedItem
    ? [{ id: preSelectedItem.id, name: preSelectedItem.name }]
    : list;

  return (
    <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 w-full max-w-2xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl text-white font-bold">
          {preSelectedItem ? 'Print Specific Workstation' : 'Workstations'}
        </h2>

        {/* The Emergency Exit Control */}
        {preSelectedItem && (
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
              Targeted Print Mode
            </span>
            <button
              onClick={onClearTarget}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-white rounded-md text-xs font-semibold transition-colors active:scale-95"
            >
              Show All Stations ✕
            </button>
          </div>
        )}
      </div>

      {/* Hide the creation form if we are just here to print a specific label */}
      {!preSelectedItem && (
        <form action={formAction} className="flex gap-2 mb-2">
          <input name="name" placeholder="Station name" required
            className="flex-1 px-3 py-2 rounded bg-slate-700 text-white focus:outline-none focus:border-emerald-500 border border-transparent" />
          <input name="location" placeholder="Location (optional)"
            className="flex-1 px-3 py-2 rounded bg-slate-700 text-white focus:outline-none focus:border-emerald-500 border border-transparent" />
          <button type="submit" disabled={pending}
            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 font-semibold text-white disabled:opacity-50 transition-colors">
            {pending ? 'Creating…' : 'Create'}
          </button>
        </form>
      )}

      {state?.error && <p className="text-red-400 text-sm mb-4">{state.error}</p>}

      <button onClick={() => window.print()}
        className={`mb-4 px-4 py-2 rounded font-semibold text-white print:hidden transition-colors shadow-md
            ${preSelectedItem ? 'bg-emerald-600 hover:bg-emerald-500 w-full' : 'bg-sky-600 hover:bg-sky-500'}`}>
        {preSelectedItem ? `Print Label for ${preSelectedItem.name}` : 'Print all labels'}
      </button>

      <div className="grid grid-cols-2 gap-4 mt-4 print:block">
        {displayList.map((w) => (
          <QrLabel key={w.id} value={`STATION:${w.name}:${w.id}`} caption={w.name} />
        ))}
      </div>
    </div>
  )
}