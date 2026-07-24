'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { QrLabel } from './QrLabel'


// dis is print-only now. creating workstations moved into WorkstationManager, so
// all this does is list what's already there and turn each row into a QR label.

type Workstation = { id: string; name: string }

interface QrWorkstationGeneratorProps {
  preSelectedItem?: { id: string, name: string } | null;
  onClearTarget: () => void;
  onNavigateToWorkstationManager: () => void;
}

export function QrWorkstationGenerator({ preSelectedItem, onClearTarget, onNavigateToWorkstationManager }: QrWorkstationGeneratorProps) {
  const [list, setList] = useState<Workstation[]>([])
  const [localTarget, setLocalTarget] = useState<{ id: string, name: string } | null>(null)

  // firstly load existing workstations once (client-side) oni, fetches the id and name and load intoa  list
  useEffect(() => {
    supabase
      .from('workstations')
      .select('id, name')
      .then(({ data }) => {
        if (data) setList(data)
      })
  }, [])

  const activeTarget = preSelectedItem || localTarget;

  // If Bridge sent data, show only that ONE item. Otherwise show whole list
  const displayList = activeTarget
    ? [{ id: activeTarget.id, name: activeTarget.name }]
    : list;


  return (
    <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 w-full max-w-2xl 
      print:absolute print:top-0 print:left-0 print:w-full print:bg-white print:text-black print:border-none print:m-0 print:p-0 print:z-[9999]">

      {/* THE ABSOLUTE PRINT BREAKOUT */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          html, body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          .print-area, .print-area * {
            visibility: visible;
          }
          
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }

          @page {
            size: portrait;
            margin: 0
          }

          .qr-print-page {
            page-break-after: always;
            height: 100vh;
            width: 100vw;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .qr-print-page:last-child {
            page-break-after: auto;
          }
        }
      `}} />

      {/* The class 'print-area' ties to the CSS above */}
      <div className="print-area w-full">

        {/* Header - Hidden in print */}
        <div className="flex justify-between items-center mb-4 print:hidden">
          <h2 className="text-xl text-white font-bold">
            {activeTarget ? 'Print Specific Workstation' : 'Workstations'}
          </h2>

          {/* The Emergency Exit Control */}
          {activeTarget && (
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
                Targeted Print Mode
              </span>
              <button
                onClick={() => {
                  onClearTarget();
                  setLocalTarget(null);
                }}

                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-white rounded-md text-xs font-semibold transition-colors active:scale-95"
              >
                Show All Workstation ✕
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
            <h3 className="text-white font-bold">Create Workstation</h3>
            <p className="text-sm text-slate-400 max-w-md">
              New Workstation must be registered through the central Workstation Manager.
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

        <div className="grid grid-cols-2 gap-4 mt-4 print:block print:w-full print:m-0">
          {displayList.map((w) => (
            /* Wrap the label and button in a container */
            <div key={w.id} className="flex flex-col items-center bg-slate-800 p-4 rounded-xl border border-slate-700 
              print:p-0 print:border-none print:bg-transparent print:text-black qr-print-page">

              <QrLabel key={w.id} value={`STATION:${w.name}:${w.id}`} caption={w.name} />

              {/* The Individual Print Button */}
              {!activeTarget && (
                <button
                  onClick={() => {
                    setLocalTarget({ id: w.id, name: w.name });
                    setTimeout(() => window.print(), 100); // Wait 1 tick for state to update, then print!
                  }}
                  className="mt-4 px-4 py-2 w-full max-w-[160px] bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors print:hidden shadow-sm"
                >
                  🖨️ Print QR
                </button>
              )}

            </div>
          ))}
        </div>
      </div>
    </div>
  )
}