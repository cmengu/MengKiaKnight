'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { logout } from '@/actions/auth'
import type { Database } from '@/types/database'
import { WorkstationManager } from '@/components/manager/WorkstationManager'
import { ComponentManager } from '@/components/manager/ComponentManager'
import Link from 'next/link'
  
type Component = Database['public']['Tables']['components']['Row']
  
export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'components' | 'workstations'>('overview')
  const [componentsList, setComponentsList] = useState<Component[]>([])
  const [isLoading, setIsLoading] = useState(true)
    
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
 
 return (
   <div className="flex h-screen bg-slate-900 text-slate-200 overflow-hidden">
    
    {/* SIDEBAR NAVIGATION */}
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col justify-between">
      <div>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white tracking-wide">MEGA </h1>
          <span className="text-xl font-bold tracking-wide text-emerald-500">Precision Tracker</span>
          <img
            src="/megaknight.jpg"
            alt="megaknight"
            width={200}
            height={120}
            className="opacity-90 hover:opacity-100 transition-opacity"
          />
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'overview' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}>
            Overview Dashboard
          </button>
          <button
            onClick={() => setActiveTab('components')}
            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'components' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}>
            Component QRs
          </button>
          <button
            onClick={() => setActiveTab('workstations')}
            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'workstations' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}>
            Workstation QRs
          </button>
        </nav>
      </div>

      <div className="p-4 border-t border-slate-700 flex flex-col gap-3">
        <Link href="/manager/ask" className="w-full text-center py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded text-sm font-semibold text-emerald-400 transition-colors">
          Ask your factory →
        </Link>
        <button onClick={() => logout()} className="w-full py-2 px-4 hover:bg-red-500/10 rounded text-sm font-semibold text-slate-400 hover:text-red-400 transition-colors">
          Logout
        </button>
      </div>
    </aside>

    {/* MAIN CONTENT AREA */}
    <main className="flex-1 overflow-y-auto p-8">
      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
      <div className="max-w-6xl mx-auto border-transparent">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">Production Dashboard</h2>
            <p className="text-slate-400 mt-1">Real-time component tracking</p>
          </div>
          {/* TODO: export data
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-semibold shadow-lg transition-all">
            Export Data
          </button>
          */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
            <p className="text-slate-400 text-sm font-medium mb-2">Active Components</p>
            <h3 className="text-3xl font-bold text-white">{componentsList.filter(c => c.current_status === 'in_progress').length}</h3>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
            <p className="text-slate-400 text-sm font-medium mb-2">Completed Today</p>
            <h3 className="text-3xl font-bold text-emerald-400">{componentsList.filter(c => c.current_status === 'completed').length}</h3>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
            <p className="text-slate-400 text-sm font-medium mb-2">Pending</p>
            <h3 className="text-3xl font-bold text-amber-400">{componentsList.filter(c => c.current_status === 'pending').length}</h3>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
            <p className="text-slate-400 text-sm font-medium mb-2">Total Logged</p>
            <h3 className="text-3xl font-bold text-blue-400">{componentsList.length}</h3>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex justify-between items-center">
            <input
              type="text" 
              placeholder="Search components..." 
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
                 ) : componentsList.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-slate-500">No components found.</td></tr>
                 ) : componentsList.map((item) => (
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
      )}

      {/* TAB 2: COMPONENTS */}
      {activeTab === 'components' && (
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">Component QR Generator</h2>
          <ComponentManager />
       </div>
      )}

      {/* TAB 3: WORKSTATIONS */}
      {activeTab === 'workstations' && (
            <div className="max-w-4xl mx-auto">
              <WorkstationManager/>
            </div>
     )}

    </main>
   </div>
   )
 }