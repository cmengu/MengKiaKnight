'use client'
import { useState, useEffect, useActionState } from 'react'
import { supabase } from '@/lib/supabase'
import { QrLabel } from './QrLabel'


//literally type a name, click create, the formAction will run the function createWorkstation on the server ->
// ->  DB adds row + UUID -> returns as state created -> useEffect updates the list -> Qr label generates a QR

type Workstation = { id: string; name: string }

interface QrWorkstationGeneratorProps {
  preSelectedItem?: { id: string, name: string } | null;
  onClearTarget: () => void;
  onNavigateToWorkstationManager: () => void;
}

export function QrWorkstationGenerator({ preSelectedItem, onClearTarget, onNavigateToWorkstationManager }: QrWorkstationGeneratorProps) {
  const [list, setList] = useState<Workstation[]>([])

  // firstly load existing workstations once (client-side) oni, fetches the id and name and load intoa  list
  useEffect(() => {
    supabase.from('workstations').select('id, name').then(({ data }) => {
      if (data) setList(data)
    })
  }, [])

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
        <div className="mb-8 p-6 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-xl mb-2">
            🛠️
          </div>
          <h3 className="text-white font-bold">Create Workstation</h3>
          <p className="text-sm text-slate-400 max-w-md">
            New Workstations must be registered through the central Workstation Manager.
          </p>
          <button
            onClick={onNavigateToWorkstationManager} 
            className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors active:scale-95 shadow-md"
          >
            Go to Workstation Manager →
          </button>
        </div>
      )}

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