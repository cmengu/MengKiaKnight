'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Boxes, Factory, Map, QrCode, Sparkles, UserCheck } from 'lucide-react'
import { logout } from '@/actions/auth'

import { DashboardOverview } from '@/components/manager/DashboardOverview'
import { QrWorkstationGenerator } from '@/components/manager/QrWorkstationGenerator'
import { QrComponentGenerator } from '@/components/manager/QrComponentGenerator'
import { WorkstationManager } from '@/components/manager/WorkstationManager'
import { ComponentManager } from '@/components/manager/Component/ComponentManager'
import { WorkerApprovals } from '@/components/manager/WorkerApprovals'
import { FloorView } from '@/components/floor/FloorView'
import { SideNav, type NavItem } from '@/components/ui/SideNav'
import { Button } from '@/components/ui/Button'

type Tab = 'overview' | 'floor' | 'components' | 'workstations' | 'qr' | 'approvals'

const NAV_ITEMS: NavItem<Tab>[] = [
  { id: 'overview',     label: 'Overview Dashboard',  icon: LayoutDashboard },
  { id: 'floor',        label: 'Factory Floor',       icon: Map },
  { id: 'components',   label: 'Component Manager',   icon: Boxes },
  { id: 'workstations', label: 'Workstation Manager', icon: Factory },
  { id: 'qr',           label: 'QR Generator Hub',    icon: QrCode },
  { id: 'approvals',    label: 'Worker Approvals',    icon: UserCheck },
]

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [qrSubTab, setQrSubTab] = useState<'components' | 'workstations'>('components')

  const [targetQrItem, setTargetQrItem] = useState<{ id: string, name: string } | null>(null)

  // Bridge function between managers and QR
  const handleNavigateToQr = (type: 'components' | 'workstations', id: string, name: string) => {
    setTargetQrItem({ id, name }) // Save the specific item
    setQrSubTab(type)             // Switch to the correct sub-tab
    setActiveTab('qr')            // Switch to the main QR tab
  }

  const handleNavigateToManager = (type: 'components' | 'workstations') => {
    setActiveTab(type)
    setTargetQrItem(null)
  }

  return (
    <div className="flex h-screen bg-surface-base text-fg overflow-hidden">
      <div className="print:hidden flex">
        <SideNav
          brand="MEGA"
          subtitle="Precision Tracker"
          items={NAV_ITEMS}
          activeId={activeTab}
          onSelect={setActiveTab}
          footer={
            <>
              <Link
                href="/manager/ask"
                className="print:hidden w-full flex items-center justify-center gap-2 py-2 px-4 bg-surface-overlay hover:bg-surface-hover rounded-lg text-sm font-semibold text-brand-fg transition-colors"
              >
                <Sparkles size={16} />
                Ask your factory
              </Link>
              <Button variant="danger" className="print:hidden w-full" onClick={() => logout()}>
                Logout
              </Button>
            </>
          }
        />
      </div>

      <main className="flex-1 overflow-y-auto p-8 ambient-glow print:p-0 print:m-0 print:overflow-visible print:block print:w-full">
        {activeTab === 'overview' && <DashboardOverview />}

        {activeTab === 'floor' && (
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-1">Factory Floor</h2>
            <p className="text-slate-400 mb-6">
              Live map of where every component is. Drag stations to match your real layout.
            </p>
            <FloorView />
          </div>
        )}

        {activeTab === 'components' && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">Component Manager</h2>
            <ComponentManager
              onNavigateToQr={(id, name) => handleNavigateToQr('components', id, name)}
            />
          </div>
        )}

        {activeTab === 'workstations' && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">Workstation Database</h2>
            <WorkstationManager
              onNavigateToQr={(id, name) => handleNavigateToQr('workstations', id, name)}
            />
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-fg mb-6">Worker Approvals</h2>
            <WorkerApprovals />
          </div>
        )}

        {activeTab === 'qr' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-fg mb-6 print:hidden">QR Generator Hub</h2>

            {/* Sub-navigation for QR generation */}
            <div className="flex space-x-2 mb-6 border-b border-slate-700 pb-4 print:hidden">
              <button
                onClick={() => {
                  setQrSubTab('components')
                  setTargetQrItem(null)
                }}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${qrSubTab === 'components' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                Component QRs
              </button>
              <button
                onClick={() => {
                  setQrSubTab('workstations')
                  setTargetQrItem(null)
                }}
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
                onNavigateToComponentManager={() => handleNavigateToManager('components')}
              />
            ) : (
              <QrWorkstationGenerator
                preSelectedItem={targetQrItem}
                onClearTarget={() => setTargetQrItem(null)}
                onNavigateToWorkstationManager={() => handleNavigateToManager('workstations')}
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
