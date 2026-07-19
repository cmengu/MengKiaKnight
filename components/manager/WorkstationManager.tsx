'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Workstation = {
  id: string
  name: string
  location: string | null
  is_qa: boolean
  is_final_station: boolean
  is_active: boolean
}

interface WorkstationManagerProps {
  onNavigateToQr: (id: string, name: string) => void;
}

export function WorkstationManager({ onNavigateToQr }: WorkstationManagerProps) {
  const [workstations, setWorkstations] = useState<Workstation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dropdown Kebab menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Form States
  const [newName, setNewName] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [isQa, setIsQa] = useState(false)
  const [isFinal, setIsFinal] = useState(false)

  // close dropdown kebab menu if user clicks anywhere else on screen
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null)
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

  // 1. Fetch Active Workstations on load.
  // declared above its own effect — a `const` arrow fn defined after the caller
  // is still in the temporal dead zone when the effect closure is created
  const fetchWorkstations = async () => {
    // isLoading already starts true + dis only runs on mount, so no need to set
    // it again — doing it synchronously in an effect = one wasted render
    const { data, error } = await supabase
      .from('workstations')
      .select('*')
      .eq('is_active', true) //only fetch active ones
      .order('created_at', { ascending: false })

    // we were swallowing dis error completely b4 — silent empty list, no clue y
    if (error) console.error('Error fetching workstations:', error)
    if (data) setWorkstations(data)
    setIsLoading(false)
  }

  // TODO(tech-debt): same fetch-on-mount pattern as ComponentManager — should be
  // server-side or a query lib. grandfathered so the rule stays strict for new code.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWorkstations()
  }, [])

  // 2. Create new workstation
  const handleCreate = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setIsSubmitting(true)

    const { data, error } = await supabase
      .from('workstations')
      .insert([{
        name: newName,
        location: newLocation || null,
        is_qa: isQa,
        is_final_station: isFinal,
        is_active: true
      }])
      .select()
      .single()

    if (data) {
      // Add new station to top of local list
      setWorkstations([data, ...workstations])
      //Reset form
      setNewName('')
      setNewLocation('')
      setIsQa(false)
      setIsFinal(false)
    } else if (error) {
      alert(`Error creating workstation: ${error.message}`)
    }

    setIsSubmitting(false)
  }

  // 3. "Soft Delete" deactivation feature
  const handleDeactivate = async (id: string, name: string) => {
    const confirmed = window.confirm(`Are you sure you want to deactivate ${name}?
      Historical data will be saved, but it will no longer be scannable`)

    if (!confirmed) return

    const { error } = await supabase
      .from('workstations')
      .update({ is_active: false })
      .eq('id', id)

    if (!error) {
      //remove it from ui immediately
      setWorkstations(workstations.filter(w => w.id !== id))
    } else {
      alert("Failed to deactivate workstation.")
    }
  }

  return (
    <div className="space-y-8">

      {/* CONTROL PANEL */}
      <div className="bg-surface-raised bg-gradient-to-b from-white/[0.045] to-transparent p-6 rounded-xl border border-border-subtle shadow-card hover:border-border-strong transition-colors duration-200">
        <h3 className="text-xl text-fg font-bold mb-4">Add New Workstation</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex gap-4">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Station Name (e.g. Soldering A)"
              required
              className="flex-1 px-4 py-3 rounded-lg bg-surface-base border border-border-strong text-fg placeholder-fg-muted focus:outline-none focus:border-brand transition-colors"
            />
            <input
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="Location (Optional)"
              className="flex-1 px-4 py-3 rounded-lg bg-surface-base border border-border-strong text-fg placeholder-fg-muted focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div className="flex items-center gap-6 p-4 bg-surface-base rounded-lg border border-border-subtle">
            <label className="flex items-center gap-2 cursor-pointer text-fg-secondary hover:text-fg transition-colors">
              <input
                type="checkbox"
                checked={isQa}
                onChange={(e) => {
                  setIsQa(e.target.checked);
                  if (e.target.checked) setIsFinal(false); // Untick Final if QA is ticked
                }}
                className="w-5 h-5 rounded border-border-strong accent-purple-600"
              />
              <span className="font-semibold">Quality Assurance (QA) Station</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-fg-secondary hover:text-fg transition-colors">
              <input
                type="checkbox"
                checked={isFinal}
                onChange={(e) => {
                  setIsFinal(e.target.checked);
                  if (e.target.checked) setIsQa(false); // Untick QA if Final is ticked
                }}
                className="w-5 h-5 rounded border-border-strong accent-info"
              />
              <span className="font-semibold">Final Packaging Station</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg bg-brand hover:bg-brand-hover font-bold text-white disabled:opacity-50 transition-all shadow-[0_0_16px_rgba(16,185,129,0.25)] hover:shadow-[0_0_22px_rgba(16,185,129,0.4)]"
          >
            {isSubmitting ? 'Provisioning Station...' : 'Create Workstation'}
          </button>
        </form>
      </div>

      {/* DATA TABLE */}
      <div className="bg-surface-raised bg-gradient-to-b from-white/[0.045] to-transparent rounded-xl border border-border-subtle shadow-card hover:border-border-strong transition-colors duration-200 overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex justify-between items-center">
          <h3 className="text-lg text-fg font-bold">Active Factory Layout</h3>
          <span className="text-fg-secondary text-sm">{workstations.length} total stations</span>
        </div>

        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-base/50 text-fg-secondary text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Location</th>
                <th className="p-4 font-semibold">Routing Role</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {isLoading ? (
                <tr><td colSpan={4} className="p-8 text-center text-fg-muted">Loading factory floor...</td></tr>
              ) : workstations.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-fg-muted">No active workstations found.</td></tr>
              ) : workstations.map((station, index) => (
                <tr key={station.id} className="hover:bg-surface-hover transition-colors">
                  <td className="p-4 font-bold text-fg">{station.name}</td>
                  <td className="p-4 text-fg-secondary">{station.location || '-'}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {station.is_qa && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-600/10 text-purple-700 border border-purple-600/20">QA Intercept</span>
                      )}
                      {station.is_final_station && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-info/10 text-info border border-info/20">Final Stage</span>
                      )}
                      {!station.is_qa && !station.is_final_station && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-surface-overlay text-fg-secondary">Standard Route</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-3 relative">

                      {/* Primary Action */}
                      <button
                        onClick={() => onNavigateToQr(station.id, station.name)}
                        className="text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-500 transition-colors px-4 py-2 rounded-lg shadow-md hover:shadow-lg active:scale-95"
                      >
                        Print Label
                      </button>

                      {/* The Kebab Menu Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevents the window click listener from immediately closing it
                          setOpenMenuId(openMenuId === station.id ? null : station.id);
                        }}
                        className="p-2 text-fg-secondary hover:text-fg rounded-md hover:bg-surface-hover transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                        </svg>
                      </button>

                      {/* The Floating Dropdown Menu */}
                      {openMenuId === station.id && (
                        <div className={`absolute right-0 w-48 bg-surface-raised border border-border-subtle rounded-lg shadow-overlay z-50 py-1 overflow-hidden
                          ${index === workstations.length - 1 ? 'bottom-10 mb-2' : 'top-10'}`}
                        >
                          <button
                            className="w-full text-left px-4 py-3 text-sm font-medium text-fg-muted cursor-not-allowed border-b border-border-subtle"
                            disabled
                          >
                            ✏️ Edit Station (V2)
                          </button>
                          <button
                            onClick={() => {
                              handleDeactivate(station.id, station.name);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-3 text-sm font-bold text-danger hover:bg-danger/10 transition-colors"
                          >
                            🗑️ Deactivate
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
