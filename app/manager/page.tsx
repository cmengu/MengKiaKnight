'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import {
  LayoutDashboard, QrCode, Factory, Loader, Clock, CheckCircle2,
  AlertTriangle, PackageSearch, Sparkles,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logout } from '@/actions/auth'
import type { Database } from '@/types/database'
import { WorkstationManager } from '@/components/manager/WorkstationManager'
import { ComponentManager } from '@/components/manager/ComponentManager'
import { SideNav, type NavItem } from '@/components/ui/SideNav'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DataTable } from '@/components/ui/table/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'

type Component = Database['public']['Tables']['components']['Row']
type Tab = 'overview' | 'components' | 'workstations'

const NAV_ITEMS: NavItem<Tab>[] = [
  { id: 'overview',     label: 'Overview Dashboard', icon: LayoutDashboard },
  { id: 'components',   label: 'Component QRs',      icon: QrCode },
  { id: 'workstations', label: 'Workstation QRs',    icon: Factory },
]

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '-'
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function isToday(dateStr: string | null): boolean {
  return !!dateStr && new Date(dateStr).toDateString() === new Date().toDateString()
}

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
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

  const columns: ColumnDef<Component>[] = [
    {
      accessorKey: 'id',
      header: 'Component ID',
      cell: ({ getValue }) => (
        <span className="font-mono text-sm text-fg-secondary">{getValue<string>().substring(0, 8)}…</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ getValue }) => <span className="font-medium text-fg">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'current_workstation_name',
      header: 'Current Station',
      cell: ({ getValue }) => (
        <span className="text-fg-secondary">{getValue<string | null>() || 'Unassigned'}</span>
      ),
    },
    {
      accessorKey: 'current_status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue<string | null>()} />,
    },
    {
      accessorKey: 'last_updated_by',
      header: 'Last Operator',
      cell: ({ getValue }) => <span className="text-fg-secondary">{getValue<string | null>() || '-'}</span>,
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated',
      cell: ({ getValue }) => <span className="text-fg-muted text-sm">{timeAgo(getValue<string | null>())}</span>,
    },
  ]

  const flaggedCount = componentsList.filter(c => c.current_status === 'flagged').length

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
        {activeTab === 'overview' && (
          <div className="max-w-6xl mx-auto">

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-fg">Production Dashboard</h2>
              <p className="text-fg-secondary mt-1">Real-time component tracking</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              <StatCard
                label="Active Components"
                value={componentsList.filter(c => c.current_status === 'in_progress').length}
                icon={Loader}
                tone="info"
              />
              <StatCard
                label="Pending"
                value={componentsList.filter(c => c.current_status === 'pending').length}
                icon={Clock}
                tone="warning"
              />
              <StatCard
                label="Completed Today"
                value={componentsList.filter(c => c.current_status === 'completed' && isToday(c.updated_at)).length}
                icon={CheckCircle2}
                tone="success"
              />
              <StatCard
                label="Flagged"
                value={flaggedCount}
                icon={AlertTriangle}
                tone={flaggedCount > 0 ? 'danger' : 'default'}
                delta={flaggedCount > 0 ? 'Needs attention' : 'All clear'}
              />
            </div>

            <DataTable
              columns={columns}
              data={componentsList}
              isLoading={isLoading}
              searchPlaceholder="Search components..."
              filterTabs={{
                columnId: 'current_status',
                options: [
                  { value: 'pending',     label: 'Pending' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'completed',   label: 'Completed' },
                  { value: 'flagged',     label: 'Flagged' },
                ],
              }}
              emptyState={
                <EmptyState
                  icon={PackageSearch}
                  title="No components found"
                  description="Create a component batch and print its QR labels to start tracking."
                  action={
                    <Button onClick={() => setActiveTab('components')}>
                      Create a component
                    </Button>
                  }
                />
              }
            />
          </div>
        )}

        {activeTab === 'components' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-fg mb-6">Component QR Generator</h2>
            <ComponentManager />
          </div>
        )}

        {activeTab === 'workstations' && (
          <div className="max-w-4xl mx-auto">
            <WorkstationManager />
          </div>
        )}
      </main>
    </div>
  )
}
