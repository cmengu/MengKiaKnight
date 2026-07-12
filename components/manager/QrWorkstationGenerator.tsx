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
    <div className="bg-surface-raised bg-gradient-to-b from-white/[0.045] to-transparent p-8 rounded-xl border border-border-subtle shadow-card hover:border-border-strong transition-colors duration-200 w-full max-w-2xl">
      <h2 className="text-xl text-fg font-bold mb-4">Workstations</h2>

      {/* the form calls server action */}
      <form action={formAction} className="flex gap-2 mb-2">
        <input name="name" placeholder="Station name" required
          className="flex-1 px-3 py-2 rounded-lg bg-surface-base border border-border-strong text-fg placeholder-fg-muted focus:outline-none focus:border-brand transition-colors" />
        <input name="location" placeholder="Location (optional)"
          className="flex-1 px-3 py-2 rounded-lg bg-surface-base border border-border-strong text-fg placeholder-fg-muted focus:outline-none focus:border-brand transition-colors" />
        <button type="submit" disabled={pending}
          className="px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover font-semibold text-white disabled:opacity-50 transition-all shadow-[0_0_14px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.35)]">
          {pending ? 'Creating…' : 'Create'}
        </button>
      </form>
      {state?.error && <p className="text-danger text-sm mb-4">{state.error}</p>}

      <button onClick={() => window.print()}
          className="mb-4 px-4 py-2 rounded-lg bg-info hover:bg-info/90 font-semibold text-white transition-colors print:hidden">
          Print all labels
      </button>

      <div className="grid grid-cols-2 gap-4 mt-4 print:block">
        {displayList.map((w) => (
          <QrLabel key={w.id} value={`STATION:${w.name}:${w.id}`} caption={w.name} />
        ))}
      </div>
    </div>
  )
}