'use client'

import { useState, useEffect } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Loader, Clock, CheckCircle2, AlertTriangle, PackageSearch } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DataTable } from '@/components/ui/table/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'

type Component = Database['public']['Tables']['components']['Row']

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

export function DashboardOverview() {
  const [componentsList, setComponentsList] = useState<Component[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // The database fetch now lives inside the component that actually uses it
  useEffect(() => {
    const fetchComponents = async () => {
      const { data, error } = await supabase
        .from('components')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching dashboard overview:', error)
        return
      }

      if (data) if (data) {
      // Sinking the 'completed' status to the bottom while keeping deadline sort
      const sortedData = data.sort((a, b) => {
        if (a.current_status === 'completed' && b.current_status !== 'completed') return 1;
        if (a.current_status !== 'completed' && b.current_status === 'completed') return -1;
        return 0; // If neither or both are completed, keep their original deadline order
      });

      setComponentsList(sortedData)
    }
      setIsLoading(false)
    }
    fetchComponents()
  }, [])

  const flaggedCount = componentsList.filter(c => c.current_status === 'flagged').length

  return (
    <div className="max-w-6xl mx-auto">

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-fg">Production Dashboard</h2>
        <p className="text-fg-secondary mt-1">Real-time component tracking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {/* neutral values by design — color is reserved for the exception
            (Flagged) so the eye lands there first */}
        <StatCard
          label="Active Components"
          value={componentsList.filter(c => c.current_status === 'in_progress').length}
          icon={Loader}
          isLoading={isLoading}
        />
        <StatCard
          label="Pending"
          value={componentsList.filter(c => c.current_status === 'pending').length}
          icon={Clock}
          isLoading={isLoading}
        />
        <StatCard
          label="Completed Today"
          value={componentsList.filter(c => c.current_status === 'completed' && isToday(c.updated_at)).length}
          icon={CheckCircle2}
          isLoading={isLoading}
        />
        <StatCard
          label="Flagged"
          value={flaggedCount}
          icon={AlertTriangle}
          tone={flaggedCount > 0 ? 'danger' : 'default'}
          delta={flaggedCount > 0 ? 'Needs attention' : 'All clear'}
          isLoading={isLoading}
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
          />
        }
      />
    </div>
  )
}
