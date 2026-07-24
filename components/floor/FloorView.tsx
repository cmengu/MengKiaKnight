'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeChange,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AlertTriangle, Flag, Radio, RefreshCw } from 'lucide-react'

import { useFloorData, type FloorStation } from '@/hooks/useFloorData'
import { WorkstationNode, type WorkstationNodeType } from './WorkstationNode'
import { TransitEdge, type TransitEdgeType } from './TransitEdge'

// declared outside the component on purpose — React Flow warns (loudly) if these
// objects are recreated on every render
const nodeTypes: NodeTypes = { workstation: WorkstationNode }
const edgeTypes: EdgeTypes = { transit: TransitEdge }

// where stations sit before anyone has dragged them
const GRID_COLS = 3
const GRID_GAP_X = 300
const GRID_GAP_Y = 210

function autoPosition(index: number) {
  return {
    x: (index % GRID_COLS) * GRID_GAP_X + 60,
    y: Math.floor(index / GRID_COLS) * GRID_GAP_Y + 60,
  }
}

export function FloorView() {
  const { stations, flows, isLoading, error, canPersist, isLive, reload, savePosition } =
    useFloorData()

  // where the manager has dragged things dis session. keeping it separate from the
  // fetched data means a realtime refresh can't yank a node out from under the cursor.
  const [dragged, setDragged] = useState<Record<string, { x: number; y: number }>>({})

  const nodes = useMemo<WorkstationNodeType[]>(
    () =>
      stations.map((station, i) => ({
        id: station.id,
        type: 'workstation' as const,
        position:
          dragged[station.id] ??
          (station.posX !== null && station.posY !== null
            ? { x: station.posX, y: station.posY }
            : autoPosition(i)),
        data: station as FloorStation & Record<string, unknown>,
      })),
    [stations, dragged],
  )

  const edges = useMemo<TransitEdgeType[]>(
    () =>
      flows.map((flow) => ({
        id: flow.id,
        source: flow.from,
        target: flow.to,
        type: 'transit' as const,
        data: { count: flow.count, carriedFlagged: flow.carriedFlagged },
      })),
    [flows],
  )

  // fully controlled — no useNodesState, so there's no effect syncing two copies of
  // the same truth and no chance of them drifting apart
  const onNodesChange = useCallback((changes: NodeChange<WorkstationNodeType>[]) => {
    setDragged((prev) => {
      const next = { ...prev }
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          next[change.id] = change.position
        }
      }
      return next
    })
  }, [])

  // note: React Flow hands us the NATIVE event here, not React's synthetic one
  const onNodeDragStop = useCallback(
    (_e: MouseEvent | TouchEvent, node: WorkstationNodeType) => {
      savePosition(node.id, node.position.x, node.position.y)
    },
    [savePosition],
  )

  // headline numbers, so the manager gets the story without reading every box
  const totals = useMemo(
    () =>
      stations.reduce(
        (acc, s) => ({
          onFloor: acc.onFloor + s.total,
          flagged: acc.flagged + s.flagged,
          overdue: acc.overdue + s.overdue,
        }),
        { onFloor: 0, flagged: 0, overdue: 0 },
      ),
    [stations],
  )

  if (error) {
    return (
      <div className="rounded-2xl border-2 border-red-500/50 bg-red-500/10 p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 text-red-400" size={28} />
        <p className="font-bold text-red-300 mb-1">Could not load the factory floor</p>
        <p className="text-sm text-slate-400 mb-4">{error}</p>
        <button
          onClick={reload}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold"
        >
          Try again
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-[640px] rounded-2xl border border-slate-700 bg-slate-900/60 flex items-center justify-center">
        <p className="text-slate-500 animate-pulse">Mapping the factory floor…</p>
      </div>
    )
  }

  if (stations.length === 0) {
    return (
      <div className="h-[400px] rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 flex flex-col items-center justify-center text-center px-8">
        <p className="font-bold text-slate-300 mb-1">No workstations yet</p>
        <p className="text-sm text-slate-500">
          Add stations in the Workstation Manager and they will appear here automatically.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* summary strip */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/70 border border-slate-700">
          <span className="text-lg font-bold text-white leading-none">{totals.onFloor}</span>
          <span className="text-xs text-slate-400">on the floor</span>
        </div>

        {totals.flagged > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/40">
            <Flag size={13} className="text-red-400" />
            <span className="text-lg font-bold text-red-300 leading-none">{totals.flagged}</span>
            <span className="text-xs text-red-300/80">flagged</span>
          </div>
        )}

        {totals.overdue > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40">
            <span className="text-lg font-bold text-amber-300 leading-none">{totals.overdue}</span>
            <span className="text-xs text-amber-300/80">overdue</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto text-xs">
          <Radio size={12} className={isLive ? 'text-emerald-400' : 'text-slate-600'} />
          <span className={isLive ? 'text-emerald-400' : 'text-slate-500'}>
            {isLive ? 'Live' : 'Not live'}
          </span>
          <button
            onClick={reload}
            title="Refresh"
            className="ml-2 p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* only shows up when the migration hasn't been run */}
      {!canPersist && (
        <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          Layout changes are not being saved. Run <code className="font-mono">supabase/floor_view.sql</code>{' '}
          to add the position columns, and your arrangement will stick between visits.
        </p>
      )}

      <div className="h-[640px] rounded-2xl border border-slate-700 overflow-hidden bg-slate-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.6}
          proOptions={{ hideAttribution: false }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#2a2a2e" />
          <Controls className="!bg-slate-800 !border-slate-700 [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!text-slate-300" />
          <MiniMap
            pannable
            zoomable
            className="!bg-slate-900 !border !border-slate-700"
            nodeColor={(n) => {
              const d = n.data as unknown as FloorStation
              if (!d?.isActive) return '#475569'
              if (d.flagged > 0) return '#ef4444'
              if (d.overdue > 0) return '#f59e0b'
              if (d.isFinal) return '#10b981'
              return '#64748b'
            }}
          />
        </ReactFlow>
      </div>

      {/* legend — colour only helps if people know what it means */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border-2 border-red-500" /> defect here
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border-2 border-amber-500" /> running late
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border-2 border-emerald-500/70" /> final station
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border-2 border-slate-600" /> normal
        </span>
        <span className="ml-auto italic">
          Arrows are real routes taken, drawn from scan history. Drag stations to match your floor.
        </span>
      </div>
    </div>
  )
}
