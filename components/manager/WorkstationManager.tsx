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

export function WorkstationManager() {
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

  // 1. Fetch Active Workstations on load
  useEffect(() => {
    fetchWorkstations()
  }, [])

  const fetchWorkstations = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('workstations')
      .select('*')
      .eq('is_active', true) //only fetch active ones
      .order('created_at', { ascending: false })

    if (data) setWorkstations(data)
    setIsLoading(false)
  }

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
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
        <h3 className="text-xl text-white font-bold mb-4">Add New Workstation</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex gap-4">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Station Name (e.g. Soldering A)"
              required
              className="flex-1 px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
            />
            <input
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="Location (Optional)"
              className="flex-1 px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={isQa}
                onChange={(e) => {
                  setIsQa(e.target.checked);
                  if (e.target.checked) setIsFinal(false); // Untick Final if QA is ticked
                }}
                className="w-5 h-5 rounded border-slate-600 text-purple-500 focus:ring-purple-500 bg-slate-800"
              />
              <span className="font-semibold">Quality Assurance (QA) Station</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={isFinal}
                onChange={(e) => {
                  setIsFinal(e.target.checked);
                  if (e.target.checked) setIsQa(false); // Untick QA if Final is ticked
                }}
                className="w-5 h-5 rounded border-slate-600 text-blue-500 focus:ring-blue-500 bg-slate-800"
              />
              <span className="font-semibold">Final Packaging Station</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-white disabled:opacity-50 transition-colors shadow-lg"
          >
            {isSubmitting ? 'Provisioning Station...' : 'Create Workstation'}
          </button>
        </form>
      </div>

      {/* DATA TABLE */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-700 bg-slate-800 flex justify-between items-center">
          <h3 className="text-lg text-white font-bold">Active Factory Layout</h3>
          <span className="text-slate-400 text-sm">{workstations.length} total stations</span>
        </div>

        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Location</th>
                <th className="p-4 font-semibold">Routing Role</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {isLoading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading factory floor...</td></tr>
              ) : workstations.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">No active workstations found.</td></tr>
              ) : workstations.map((station, index) => (
                <tr key={station.id} className="hover:bg-slate-750 transition-colors">
                  <td className="p-4 font-bold text-white">{station.name}</td>
                  <td className="p-4 text-slate-400">{station.location || '-'}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {station.is_qa && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">QA Intercept</span>
                      )}
                      {station.is_final_station && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">Final Stage</span>
                      )}
                      {!station.is_qa && !station.is_final_station && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-700 text-slate-300">Standard Route</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-3 relative">

                      {/* Primary Action */}
                      <button className="text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-500 transition-colors px-4 py-2 rounded-lg shadow-md hover:shadow-lg active:scale-95">
                        Print Label
                      </button>

                      {/* The Kebab Menu Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevents the window click listener from immediately closing it
                          setOpenMenuId(openMenuId === station.id ? null : station.id);
                        }}
                        className="p-2 text-slate-400 hover:text-white rounded-md hover:bg-slate-700 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                        </svg>
                      </button>

                      {/* The Floating Dropdown Menu */}
                      {openMenuId === station.id && (
                        <div className={`absolute right-0 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl z-50 py-1 overflow-hidden
                          ${index === workstations.length - 1 ? 'bottom-10 mb-2' : 'top-10'}`}
                        >
                          <button
                            className="w-full text-left px-4 py-3 text-sm font-medium text-slate-400 cursor-not-allowed border-b border-slate-700"
                            disabled
                          >
                            ✏️ Edit Station (V2)
                          </button>
                          <button
                            onClick={() => {
                              handleDeactivate(station.id, station.name);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors"
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