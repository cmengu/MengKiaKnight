'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

//Define shape of joined data
type ComponentItem = {
  id: string
  name: string
  current_status: string
  deadline: string | null
  last_updated_by: string | null
  workstations: { name: string } | null // This comes from the Supabase join
}

interface ComponentManagerProps {
  onNavigateToQr: (id: string, name: string) => void;
}

export function ComponentManager({ onNavigateToQr }: ComponentManagerProps) {
  const [componentsList, setComponentsList] = useState<ComponentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [editingItem, setEditingItem] = useState<ComponentItem | null>(null)
  const [editForm, setEditForm] = useState({ status: '', deadline: '' })
  const [isUpdating, setIsUpdating] = useState(false)

  const [historyItem, setHistoryItem] = useState<ComponentItem | null>(null)
  const [historyLogs, setHistoryLogs] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  useEffect(() => {
    fetchComponents()
  }, [])

  const fetchComponents = async () => {
    setIsLoading(true)

    //use a join here to get actual name of workstation, not just ID
    const { data, error } = await supabase
      .from('components')
      .select(`
        id,
        name,
        current_status,
        deadline,
        last_updated_by,
        workstations ( name )
      `)
      .order('deadline', { ascending: true, nullsFirst: false }) //most urgent at top

    if (error) {
      console.error("Error fetching components:", error)
    } else if (data) {
      //supabase returns joined data as object or array, need cast to our type
      setComponentsList(data as unknown as ComponentItem[])
    }

    setIsLoading(false)
  }

  // Logic: God Mode Edit

  const handleOpenEdit = (item: ComponentItem) => {
    setEditingItem(item)
    setEditForm({
      status: item.current_status,
      deadline: item.deadline ? new Date(item.deadline).toISOString().slice(0, 16) : ''
    })
  }

  const handleSaveEdit = async () => {
    if (!editingItem) return
    setIsUpdating(true)

    const newDeadline = editForm.deadline ? new Date(editForm.deadline).toISOString() : null

    const { error } = await supabase
      .from('components')
      .update({
        current_status: editForm.status,
        deadline: newDeadline
      })
      .eq('id', editingItem.id)

    if (!error) {
      //update local state to reflect changes instantly
      setComponentsList(prev => prev.map(c =>
        c.id === editingItem.id
          ? { ...c, current_status: editForm.status, deadline: newDeadline }
          : c
      ))
      setEditingItem(null)
    } else {
      alert("Failed to update component.")
    }
    setIsUpdating(false)
  }

  // Logic: History Drawer
  const handleOpenHistory = async (item: ComponentItem) => {
    setHistoryItem(item)
    setIsLoadingHistory(true)

    const { data, error } = await supabase
      .from('status_logs')
      .select(`
          created_at,
          scanned_by,
          new_status,
          workstations ( name )
        `)
      .eq('component_id', item.id)
      .order('created_at', { ascending: false })

    if (data) setHistoryLogs(data)
    setIsLoadingHistory(false)
  }

  // Triage Logic: determine urgency based on deadline
  const getRowStyle = (deadline: string | null, status: string) => {
    if (status === 'completed') return 'hover:bg-slate-750' //completed dont need alarms
    if (!deadline) return 'hover:bg-slate-750' //no deadline means not urgent

    const now = new Date()
    const due = new Date(deadline)
    const hoursRemaining = (due.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursRemaining < 0) {
      return 'bg-red-900/20 hover:bg-red-900/30 border-l-4 border-red-500' // overdue
    } else if (hoursRemaining < 24) {
      return 'bg-amber-900/20 hover:bg-amber-900/30 border-l-4 border-amber-500' // Due soon
    }
    return 'hover:bg-slate-750 border-l-4 border-transparent' //Still considered safe
  }

  //Search filter
  const filteredComponents = componentsList.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">

      {/* Triage & Search Header */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm flex justify-between items-center">
        <div>
          <h3 className="text-xl text-white font-bold">Active Work Orders</h3>
          <p className="text-sm text-slate-400 mt-1">Sorted by urgency</p>
        </div>

        <input
          type="text"
          placeholder="Search ID or Name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg w-72 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* The Data Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Component ID</th>
                <th className="p-4 font-semibold">Name & Deadline</th>
                <th className="p-4 font-semibold">Current Station</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 border-t border-slate-700">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading work orders...</td></tr>
              ) : filteredComponents.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No components found.</td></tr>
              ) : filteredComponents.map((item) => (
                <tr key={item.id} className={`transition-colors ${getRowStyle(item.deadline, item.current_status)}`}>
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
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => handleOpenHistory(item)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors" title="View History">
                        🕒 History
                      </button>
                      <button onClick={() => handleOpenEdit(item)} className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors" title="Edit Override">
                        ✏️ Edit
                      </button>
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

      {/* Editing Component */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Override: {editingItem.name}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Force Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="defect">Defect / Rework</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Adjust Deadline</label>
                <input
                  type="datetime-local"
                  value={editForm.deadline}
                  onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setEditingItem(null)} className="px-4 py-2 rounded-lg font-semibold text-slate-300 hover:bg-slate-700 transition-colors">Cancel</button>
              <button onClick={handleSaveEdit} disabled={isUpdating} className="px-4 py-2 rounded-lg font-bold text-white bg-amber-600 hover:bg-amber-500 transition-colors disabled:opacity-50">
                {isUpdating ? 'Saving...' : 'Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Drawer */}
      {historyItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-slate-800 border-l border-slate-700 w-full max-w-md h-full p-6 shadow-2xl overflow-y-auto transform transition-transform">
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
              <h3 className="text-xl font-bold text-white">Timeline: {historyItem.name}</h3>
              <button onClick={() => setHistoryItem(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>

            {isLoadingHistory ? (
              <p className="text-slate-400 text-center mt-10">Fetching logs...</p>
            ) : historyLogs.length === 0 ? (
              <p className="text-slate-400 text-center mt-10">No scans recorded yet.</p>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-700">
                {historyLogs.map((log, idx) => (
                  <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-600 bg-slate-800 text-slate-300 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                      {log.new_status === 'completed' ? '🏁' : log.new_status === 'defect' ? '⚠️' : '📍'}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-900 p-4 rounded-xl border border-slate-700 shadow">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-white uppercase text-xs tracking-wider">{log.new_status.replace('_', ' ')}</div>
                        <time className="text-xs font-medium text-amber-400">{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</time>
                      </div>
                      <div className="text-sm text-slate-300 mb-2">{log.workstations?.name || 'Manager Override'}</div>
                      <div className="text-xs text-slate-500">Operated by: {log.scanned_by}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
    </div>
  )
}
