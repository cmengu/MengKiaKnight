'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Boxes, Factory, QrCode, Sparkles } from 'lucide-react'
import { logout } from '@/actions/auth'

import { DashboardOverview } from '@/components/manager/DashboardOverview'
import { QrWorkstationGenerator } from '@/components/manager/QrWorkstationGenerator'
import { QrComponentGenerator } from '@/components/manager/QrComponentGenerator'
import { WorkstationManager } from '@/components/manager/WorkstationManager'
import { ComponentManager } from '@/components/manager/ComponentManager'
import { SideNav, type NavItem } from '@/components/ui/SideNav'
import { Button } from '@/components/ui/Button'

type Tab = 'overview' | 'components' | 'workstations' | 'qr'

const NAV_ITEMS: NavItem<Tab>[] = [
  { id: 'overview',     label: 'Overview Dashboard',  icon: LayoutDashboard },
  { id: 'components',   label: 'Component Manager',   icon: Boxes },
  { id: 'workstations', label: 'Workstation Manager', icon: Factory },
  { id: 'qr',           label: 'QR Generator Hub',    icon: QrCode },
]

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [qrSubTab, setQrSubTab] = useState<'components' | 'workstations'>('components')

  return (
    <div className="flex h-screen bg-surface-base text-fg overflow-hidden">

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
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-surface-overlay hover:bg-surface-hover rounded-lg text-sm font-semibold text-brand-fg transition-colors"
            >
              <Sparkles size={16} />
              Ask your factory
            </Link>
            <Button variant="danger" className="w-full" onClick={() => logout()}>
              Logout
            </Button>
          </>
        }
      />

      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === 'overview' && <DashboardOverview />}

        {activeTab === 'components' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-fg mb-6">Component Manager</h2>
            <ComponentManager />
          </div>
        )}

        {activeTab === 'workstations' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-fg mb-6">Workstation Manager</h2>
            <WorkstationManager />
          </div>
        )}

        {activeTab === 'qr' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-fg mb-6">QR Generator Hub</h2>

            {/* Sub-navigation for QR generation */}
            <div className="flex gap-2 mb-6 border-b border-border-subtle pb-4">
              <Button
                variant={qrSubTab === 'components' ? 'primary' : 'secondary'}
                onClick={() => setQrSubTab('components')}
              >
                Component QRs
              </Button>
              <Button
                variant={qrSubTab === 'workstations' ? 'primary' : 'secondary'}
                onClick={() => setQrSubTab('workstations')}
              >
                Workstation QRs
              </Button>
            </div>

            {qrSubTab === 'components' ? <QrComponentGenerator /> : <QrWorkstationGenerator />}
          </div>
        )}
      </main>
    </div>
  )
}
