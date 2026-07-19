'use client'
import { useState, useEffect, useActionState } from 'react'
import { supabase } from '@/lib/supabase'
import { createComponent } from '@/actions/qr'
import { QrLabel } from './QrLabel'


//literally a clone of Meng's WorkstationManager

type FactoryComponent = { id: string; name: string }

interface QrComponentGeneratorProps {
  preSelectedItem?: { id: string, name: string } | null;
  onClearTarget: () => void;
}

export function QrComponentGenerator({ preSelectedItem, onClearTarget }: QrComponentGeneratorProps) {
  const [list, setList] = useState<FactoryComponent[]>([])
  const [state, formAction, pending] = useActionState(createComponent, undefined)

  // firstly load existing workstations once (client-side) oni, fetches the id and name and load intoa  list
  useEffect(() => {
    supabase
      .from('components')
      .select('id, name')
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        if (data) setList(data)
      })
  }, [])

  //then when the action returns a new row, show it immediately
  //AND add to the top of the list instantly.
  // dis is React's "adjust state while rendering" pattern instead of an effect —
  // the seenState guard makes it fire once per actual action result, and React
  // re-runs render b4 painting so the user never sees the stale list.
  const [seenState, setSeenState] = useState(state)
  if (state !== seenState) {
    setSeenState(state)
    if (state?.created) {
      const { id, name } = state.created
      setList((prev) => [{ id, name: name ?? '' }, ...prev])
    }
  }

  const displayList = preSelectedItem
    ? [{ id: preSelectedItem.id, name: preSelectedItem.name }]
    : list;

  return (
    <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 w-full max-w-2xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl text-white font-bold">
          {preSelectedItem ? 'Print Specific Component' : 'Components'}
        </h2>

        {preSelectedItem && (
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
              Targeted Print Mode
            </span>
            <button
              onClick={onClearTarget}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-white rounded-md text-xs font-semibold transition-colors active:scale-95"
            >
              Show All Components ✕
            </button>
          </div>
        )}
      </div>

      {/* the form calls server action */}
      {!preSelectedItem && (
        <form action={formAction} className="flex gap-2 mb-2">
          <input name="name" placeholder="Component Name E.g. PCB-Board-001" required
            className="flex-1 px-3 py-2 rounded bg-slate-700 text-white" />
          <button type="submit" disabled={pending}
            className="px-4 py-2 rounded bg-emerald-500 font-semibold text-white disabled:opacity-50">
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

      {/* each component has a scannable label*/}
      <div className="grid grid-cols-2 gap-4 mt-4 print:block">
        {displayList.map((c) => (
          <QrLabel key={c.id} value={`${c.id}`} caption={c.name} />
        ))}
      </div>
    </div>
  )
}