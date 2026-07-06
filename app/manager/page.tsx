'use client'

import { useState } from 'react'
import { logout } from '@/actions/auth'
import Link from 'next/link'

import { DashboardOverview } from '@/components/manager/DashboardOverview'
import { QrWorkstationGenerator } from '@/components/manager/QrWorkstationGenerator'
import { QrComponentGenerator } from '@/components/manager/QrComponentGenerator'
import { WorkstationManager } from '@/components/manager/WorkstationManager'
import { ComponentManager } from '@/components/manager/ComponentManager'


export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'components' | 'workstations' | 'qr'>('overview')
  const [qrSubTab, setQrSubTab] = useState<'components' | 'workstations'>('components')

  const [targetQrItem, setTargetQrItem] = useState<{ id: string, name: string } | null>(null)

  // Bridge function between managers and QR
  const handleNavigateToQr = (type: 'components' | 'workstations', id: string, name: string) => {
    setTargetQrItem({ id, name }) // Save the specific item
    setQrSubTab(type)             // Switch to the correct sub-tab
    setActiveTab('qr')            // Switch to the main QR tab
  }

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
              Component Manager
            </button>
            <button
              onClick={() => setActiveTab('workstations')}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'workstations' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}>
              Workstation Manager
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'qr' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}>
              QR Generator Hub
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
        {activeTab === 'overview' && <DashboardOverview />}

        {/* TAB 2: COMPONENT MANAGER */}
        {activeTab === 'components' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">Component Manager</h2>
            <ComponentManager />
          </div>
        )}

        {/* TAB 3: WORKSTATIONS */}
        {activeTab === 'workstations' && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">Workstation Database</h2>
            <WorkstationManager
              onNavigateToQr={(id, name) => handleNavigateToQr('workstations', id, name)}
            />
          </div>
        )}

        {/* Tab 4: QR GENERATOR HUB */}
        {activeTab === 'qr' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">QR Generator Hub</h2>

            {/* Sub-navigation for QR generation */}
            <div className="flex space-x-2 mb-6 border-b border-slate-700 pb-4">
              <button
                onClick={() => setQrSubTab('components')}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${qrSubTab === 'components' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                Component QRs
              </button>
              <button
                onClick={() => setQrSubTab('workstations')}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${qrSubTab === 'workstations' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                Workstation QRs
              </button>
            </div>

            {/* Render selected qr generator */}
            {qrSubTab === 'components' ? (
              <QrComponentGenerator 
                preSelectedItem={targetQrItem}
                onClearTarget={() => setTargetQrItem(null)}  
              />
            ) : (
              <QrWorkstationGenerator 
                preSelectedItem={targetQrItem}
                onClearTarget={() => setTargetQrItem(null)}
              />
            )}
          </div>
        )}

      </main>
    </div>
  )
}