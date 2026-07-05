'use client'

import { useState, type ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { SkeletonRows } from '../Skeleton'
import { Button } from '../Button'

/** Chip-style filter on one column, e.g. status: All / Pending / Flagged */
export type FilterTabs = {
  columnId: string
  options: { value: string; label: string }[]
}

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = 'Search...',
  filterTabs,
  emptyState,
  pageSize = 10,
}: {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  isLoading?: boolean
  searchPlaceholder?: string
  filterTabs?: FilterTabs
  emptyState?: ReactNode
  pageSize?: number
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })

  const activeFilter =
    (table.getColumn(filterTabs?.columnId ?? '')?.getFilterValue() as string | undefined) ?? ''

  const rows = table.getRowModel().rows

  return (
    <div className="bg-surface-raised rounded-xl border border-border-subtle shadow-card overflow-hidden">

      {/* toolbar: search + filter chips */}
      <div className="p-4 border-b border-border-subtle flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            type="text"
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="bg-surface-base border border-border-strong text-fg placeholder-fg-muted
              pl-9 pr-4 py-2 rounded-lg w-64 text-sm
              focus:outline-none focus:border-brand transition-colors"
          />
        </div>

        {filterTabs && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {[{ value: '', label: 'All' }, ...filterTabs.options].map(({ value, label }) => (
              <button
                key={value}
                onClick={() =>
                  table.getColumn(filterTabs.columnId)?.setFilterValue(value || undefined)
                }
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
                  ${activeFilter === value
                    ? 'bg-brand/15 text-brand-fg'
                    : 'text-fg-secondary hover:bg-surface-hover hover:text-fg'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-surface-base/50 text-fg-secondary text-xs uppercase tracking-wider">
                {headerGroup.headers.map(header => {
                  const canSort = header.column.getCanSort()
                  const dir = header.column.getIsSorted()
                  return (
                    <th key={header.id} className="p-4 font-semibold">
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 hover:text-fg transition-colors uppercase tracking-wider"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {dir === 'asc' ? <ArrowUp size={13} />
                            : dir === 'desc' ? <ArrowDown size={13} />
                            : <ArrowUpDown size={13} className="text-fg-muted" />}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {isLoading ? (
              <SkeletonRows rows={5} cols={columns.length} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  {emptyState ?? <p className="p-8 text-center text-fg-muted text-sm">No results.</p>}
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.id} className="hover:bg-surface-hover transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* pagination footer — hidden while loading or when one page suffices */}
      {!isLoading && table.getPageCount() > 1 && (
        <div className="p-3 border-t border-border-subtle flex items-center justify-between">
          <p className="text-fg-muted text-xs">
            {table.getFilteredRowModel().rows.length} results
          </p>
          <div className="flex items-center gap-2">
            <span className="text-fg-secondary text-xs">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button
              variant="secondary"
              className="!p-1.5"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="secondary"
              className="!p-1.5"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
