'use client'
import { useState, useEffect, useActionState } from 'react'
import { supabase } from '@/lib/supabase'
import { createComponent } from '@/actions/qr'
import { QrLabel } from './QrLabel'


//literally a clone of Meng's WorkstationManager

type FactoryComponent = { id: string; name: string }

export function ComponentManager() {
  const [list, setList] = useState<FactoryComponent[]>([])
  const [state, formAction, pending] = useActionState(createComponent, undefined)

  // firstly load existing workstations once (client-side) oni, fetches the id and name and load intoa  list
  useEffect(() => {
    supabase
        .from('components')
        .select('id, name')
        .order('updated_at', { ascending: false})
        .then(({ data }) => {
            if (data) setList(data)
    })
  }, [])

  //then when the action returns a new row, show it immediately
  //AND add to the top of the list instantly
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
        <input name="name" placeholder="Component Name E.g. PCB-Board-001" required
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

      {/* each component has a scannable label*/}
      <div className="grid grid-cols-2 gap-4 mt-4 print:block">
        {list.map((c) => (
          <QrLabel key={c.id} value={`${c.id}`} caption={c.name} />
        ))}
      </div>
    </div>
  )
}