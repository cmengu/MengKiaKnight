'use client'
import { useState, useEffect, useActionState } from 'react'
import { supabase } from '@/lib/supabase'
import { QrLabel } from './QrLabel'


//literally a clone of Meng's WorkstationManager

type FactoryComponent = { id: string; name: string }

interface QrComponentGeneratorProps {
  preSelectedItem?: { id: string, name: string } | null;
  onClearTarget: () => void;
  onNavigateToComponentManager: () => void;
}


export function QrComponentGenerator({ preSelectedItem, onClearTarget, onNavigateToComponentManager }: QrComponentGeneratorProps) {
  const [list, setList] = useState<FactoryComponent[]>([])

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

  const displayList = preSelectedItem
    ? [{ id: preSelectedItem.id, name: preSelectedItem.name }]
    : list;

  return (
    <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 w-full max-w-2xl print:bg-transparent print:border-none print:p-0 print:m-0 print:max-w-full">
      {/* 1. Added print overrides to break out of the max-width */}

      {/* 2. Added print:hidden to completely remove the header */}
      <div className="flex justify-between items-center mb-4 print:hidden">
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
      {/* 3. Added print:hidden to completely remove the Create block */}
      {!preSelectedItem && (
        <div className="mb-8 p-6 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed text-center flex flex-col items-center justify-center space-y-3 print:hidden">
          <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-xl mb-2">
            🛠️
          </div>
          <h3 className="text-white font-bold">Create Component</h3>
          <p className="text-sm text-slate-400 max-w-md">
            New components must be registered through the central Component Manager.
          </p>
          <button
            onClick={onNavigateToComponentManager} 
            className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors active:scale-95 shadow-md"
          >
            Go to Component Manager →
          </button>
        </div>
      )}

      <button onClick={() => window.print()}
        className={`mb-4 px-4 py-2 rounded font-semibold text-white print:hidden transition-colors shadow-md
            ${preSelectedItem ? 'bg-emerald-600 hover:bg-emerald-500 w-full' : 'bg-sky-600 hover:bg-sky-500'}`}>
        {preSelectedItem ? `Print Label for ${preSelectedItem.name}` : 'Print all labels'}
      </button>

      {/* each component has a scannable label*/}
      <div className="grid grid-cols-2 gap-4 mt-4 print:block print:w-full print:m-0">
        {displayList.map((c) => (
          <QrLabel key={c.id} value={`${c.id}`} caption={c.name} />
        ))}
      </div>
    </div>
  )
}