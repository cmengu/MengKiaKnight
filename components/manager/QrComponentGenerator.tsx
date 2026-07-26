'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { QrLabel } from './QrLabel'

// print-only now — creating components moved into ComponentManager. dis just lists
// what exists and turns each row into a QR label.

type FactoryComponent = { id: string; name: string }

interface QrComponentGeneratorProps {
  preSelectedItem?: { id: string, name: string } | null;
  onClearTarget: () => void;
  onNavigateToComponentManager: () => void;
}

export function QrComponentGenerator({ preSelectedItem, onClearTarget, onNavigateToComponentManager }: QrComponentGeneratorProps) {
  const [list, setList] = useState<FactoryComponent[]>([])
  const [localTarget, setLocalTarget] = useState<{ id: string, name: string } | null>(null)

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

  const activeTarget = preSelectedItem || localTarget;

  const displayList = activeTarget
    ? [{ id: activeTarget.id, name: activeTarget.name }]
    : list;

  return (
    <div className="bg-surface-raised p-8 rounded-xl border border-border-subtle w-full max-w-2xl 
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
          <h2 className="text-xl text-fg font-bold">
            {activeTarget ? 'Print Specific Component' : 'Components'}
          </h2>

          {activeTarget && (
            <div className="flex items-center gap-2">
              <span className="bg-surface-raised text-fg px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-border-subtle">
                Targeted Print Mode
              </span>
              <button
                onClick={() => {
                  onClearTarget();
                  setLocalTarget(null);
                }}
                className="px-3 py-1 bg-surface-raised hover:bg-surface-raised border border-border-subtle text-fg rounded-md text-xs font-semibold transition-colors active:scale-95"
              >
                Show All Components ✕
              </button>
            </div>
          )}
        </div>

        {/* the form calls server action */}
        {/* Added print:hidden to completely remove the Create block */}
        {!preSelectedItem && (
          <div className="mb-8 p-6 bg-surface-raised/50 rounded-xl border border-border-subtle border-dashed text-center flex flex-col items-center justify-center space-y-3 print:hidden">
            <div className="w-12 h-12 bg-surface-raised rounded-full flex items-center justify-center text-xl mb-2">
              🛠️
            </div>
            <h3 className="text-fg font-bold">Create Component</h3>
            <p className="text-sm text-fg-muted max-w-md">
              New components must be registered through the central Component Manager.
            </p>
            <button
              onClick={onNavigateToComponentManager}
              className="mt-4 px-6 py-2 bg-brand hover:bg-brand-hover text-white font-semibold rounded-lg transition-colors active:scale-95 shadow-md"
            >
              Go to Component Manager →
            </button>
          </div>
        )}

        <button onClick={() => window.print()}
          className={`mb-4 px-4 py-2 rounded font-semibold text-white print:hidden transition-colors shadow-md
            ${preSelectedItem ? 'bg-brand hover:bg-brand-hover w-full' : 'bg-brand hover:bg-brand-hover'}`}>
          {preSelectedItem ? `Print Label for ${preSelectedItem.name}` : 'Print all labels'}
        </button>

        {/* Replaced generic flex with a strict 4-column grid for A4 paper mapping */}
        <div className="grid grid-cols-2 gap-4 mt-4 print:block print:w-full print:m-0">
          {displayList.map((c) => (
            /* Wrap the label and button in a container */
            <div key={c.id} className="flex flex-col items-center bg-surface-raised p-4 rounded-xl border border-border-subtle 
              print:p-0 print:border-none print:bg-transparent print:text-black qr-print-page">

              <QrLabel value={`${c.id}`} caption={c.name} />

              {/* The Individual Print Button */}
              {!activeTarget && (
                <button
                  onClick={() => {
                    setLocalTarget({ id: c.id, name: c.name });
                    setTimeout(() => window.print(), 100); // Wait 1 tick for state to update, then print!
                  }}
                  className="mt-4 px-4 py-2 w-full max-w-[160px] bg-surface-raised hover:bg-surface-raised border border-border-subtle text-fg rounded-lg text-sm font-semibold transition-colors print:hidden shadow-sm"
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