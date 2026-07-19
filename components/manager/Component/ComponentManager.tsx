'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getUrgency, getUrgencyClasses } from '@/utils/triage'

import { CreateComponentForm } from './CreateComponentForm'
import { EditComponentModal } from './EditComponentModal'
import { HistoryDrawer } from './HistoryDrawer'

export type ComponentItem = {
  id: string
  name: string
  current_status: string
  deadline: string | null
  last_updated_by: string | null
  workstations: { name: string } | null
}

interface Props {
  onNavigateToQr: (id: string, name: string) => void;
}

export function ComponentManager({ onNavigateToQr }: Props) {
  const [componentsList, setComponentsList] = useState<ComponentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [editingItem, setEditingItem] = useState<ComponentItem | null>(null)
  const [historyItem, setHistoryItem] = useState<ComponentItem | null>(null)

  // declared b4 the effect that calls it — a `const` arrow fn defined under its own
  // caller is still in the temporal dead zone when the effect closure gets built
  const fetchComponents = async () => {
    // no setIsLoading(true) here: dis only runs on mount and isLoading already
    // starts true, so setting it again just costs us a wasted render

    const { data, error } = await supabase
      .from('components')
      .select(`id, name, current_status, deadline, last_updated_by, workstations ( name )`)
      .order('deadline', { ascending: true, nullsFirst: false })

    // we were throwing dis away — silent empty table with no clue why
    if (error) console.error('Error fetching components:', error)
    if (data) setComponentsList(data as unknown as ComponentItem[])
    setIsLoading(false)
  }

  // TODO(tech-debt): fetch-on-mount. React Compiler is right to moan — the real fix
  // is loading dis server-side or thru a query lib w/ caching, not an effect.
  // grandfathered so the rule stays an ERROR for any new code we write.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchComponents()
  }, [])

  const filteredComponents = componentsList.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 relative">

      {/* The Inline Creation Form */}
      <CreateComponentForm 
        onSuccess={(newItem) => {
          setComponentsList([newItem, ...componentsList]);
        }} 
      />

      {/* Search Header */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm flex justify-between items-center">
        <div>
          <h3 className="text-xl text-white font-bold">Active Work Orders</h3>
          <p className="text-sm text-slate-400 mt-1">Sorted by urgency</p>
        </div>

        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search ID or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg w-64 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">ID</th>
                <th className="p-4 font-semibold">Name & Deadline</th>
                <th className="p-4 font-semibold">Current Station</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 border-t border-slate-700">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading...</td></tr>
              ) : filteredComponents.map((item) => (
                <tr key={item.id} className={`transition-colors ${getUrgencyClasses(getUrgency(item.deadline, item.current_status))}`}>
                  <td className="p-4 font-mono text-sm text-slate-300">{item.id.substring(0, 8)}...</td>
                  <td className="p-4">
                    <div className="font-bold text-white">{item.name}</div>
                    <div className="text-xs mt-1 text-slate-400">
                      {item.deadline ? new Date(item.deadline).toLocaleString() : 'No deadline'}
                    </div>
                  </td>
                  <td className="p-4 text-slate-300">{item.workstations?.name || 'Unassigned'}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                      ${item.current_status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        item.current_status === 'in_progress' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          item.current_status === 'defect' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                      {item.current_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setHistoryItem(item)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors" title="History">🕒</button>
                      <button onClick={() => setEditingItem(item)} className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors" title="Edit">✏️</button>
                      <button onClick={() => onNavigateToQr(item.id, item.name)} className="text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-500 transition-colors px-3 py-2 rounded-lg shadow-md active:scale-95">
                        Print Label
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- DELEGATED PRESENTERS (The Popups) --- */}
      <EditComponentModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSuccess={(id, newStatus, newDeadline) => {
          setComponentsList(prev => prev.map(c =>
            c.id === id ? { ...c, current_status: newStatus, deadline: newDeadline } : c
          ));
          setEditingItem(null);
        }}
      />

      <HistoryDrawer
        item={historyItem}
        onClose={() => setHistoryItem(null)}
      />

    </div>
  )
}