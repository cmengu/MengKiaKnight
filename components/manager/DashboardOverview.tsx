'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Component = Database['public']['Tables']['components']['Row']

export function DashboardOverview() {
  const [componentsList, setComponentsList] = useState<Component[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // The database fetch now lives inside the component that actually uses it
  useEffect(() => {
    const fetchComponents = async () => {
      const { data, error } = await supabase
        .from('components')
        .select('*')
        .order('updated_at', { ascending: false })

      if (data) setComponentsList(data)
      setIsLoading(false)
    } 
    fetchComponents()
  }, [])

  // The search filter logic
  const filteredComponents = componentsList.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto border-transparent">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Production Dashboard</h2>
          <p className="text-slate-400 mt-1">Real-time component tracking</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <p className="text-slate-400 text-sm font-medium mb-2">Active Components</p>
          <h3 className="text-3xl font-bold text-white">{filteredComponents.filter(c => c.current_status === 'in_progress').length}</h3>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <p className="text-slate-400 text-sm font-medium mb-2">Completed Today</p>
          <h3 className="text-3xl font-bold text-emerald-400">{filteredComponents.filter(c => c.current_status === 'completed').length}</h3>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <p className="text-slate-400 text-sm font-medium mb-2">Pending</p>
          <h3 className="text-3xl font-bold text-amber-400">{filteredComponents.filter(c => c.current_status === 'pending').length}</h3>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <p className="text-slate-400 text-sm font-medium mb-2">Total Logged</p>
          <h3 className="text-3xl font-bold text-blue-400">{filteredComponents.length}</h3>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <input
            type="text" 
            placeholder="Search components by name or ID.." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg w-64 
            focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Component ID</th>
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Current Station</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Last Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
                {isLoading ? (
                <tr><td colSpan={5} className="p-4 text-center text-slate-500">Loading tracking data...</td></tr>
                ) : filteredComponents.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-slate-500">No components found.</td></tr>
                ) : filteredComponents.map((item) => (
                <tr key={item.id} className="hover:bg-slate-750 transition-colors">
                      <td className="p-4 font-mono text-sm text-slate-300">{item.id.substring(0,8)}...</td>
                      <td className="p-4 font-medium text-white">{item.name}</td>
                      <td className="p-4 text-slate-300">{item.current_workstation_name || 'Unassigned'}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                          ${item.current_status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 
                            item.current_status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' : 
                            'bg-amber-500/20 text-amber-400'}`}>
                          {item.current_status || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300">{item.last_updated_by || '-'}</td>
                    </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}