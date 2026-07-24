'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ViewportPortal,
  type Edge,
  type NodeChange,
  type NodeTypes,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AlertTriangle, Radio, RefreshCw, Wand2 } from 'lucide-react'

import { useFloorData, type FloorStation } from '@/hooks/useFloorData'
import { WorkstationNode, type WorkstationNodeType, type WorkstationNodeData } from './WorkstationNode'
import { BayDrawer } from './BayDrawer'

// declared outside the component on purpose — React Flow warns (loudly) if this object
// is recreated on every render
const nodeTypes: NodeTypes = { workstation: WorkstationNode }

// the station card's fixed footprint, used to anchor belts to its edges
const NODE_W = 212
const NODE_H = 150

// the tidy "assembly line" layout: one row, left-to-right, evenly spaced
const LINE_GAP = 108 // clear aisle between cards, wide enough for a belt + label
const LINE_STEP = NODE_W + LINE_GAP
const LINE_Y = 300
const LINE_X0 = 40

type Arrow = { id: string; sx: number; sy: number; tx: number; ty: number; red: boolean; count: number }

/**
 * The belts — drawn by hand, in flow coordinates, from the station positions.
 *
 * WHY NOT React Flow edges: RF works out where to attach an edge by measuring each node's
 * handles with a ResizeObserver, and in this React 19 / Next setup that observer never
 * fires (the same reason nodes need an explicit width/height). With no handle bounds, RF
 * silently drops every edge. Here we skip that machinery: we already know each station's
 * position and size, so we anchor the belt to the right edge of the source and the left
 * edge of the target ourselves. ViewportPortal keeps this SVG in the graph's coordinate
 * space, so the belts pan, zoom and follow a dragged station exactly like real edges would.
 */
function Belts({ arrows }: { arrows: Arrow[] }) {
  return (
    <ViewportPortal>
      <svg
        style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'visible', pointerEvents: 'none' }}
      >
        <defs>
          <marker id="belt-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#34d399" />
          </marker>
          <marker id="belt-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#f87171" />
          </marker>
        </defs>

        {arrows.map((a) => {
          const color = a.red ? '#f87171' : '#34d399'
          const marker = a.red ? 'url(#belt-red)' : 'url(#belt-green)'
          const mx = (a.sx + a.tx) / 2
          // a backward hop (e.g. QA -> Assembly rework) would otherwise cut straight
          // across the stations, so arc it up through the aisle above the line instead —
          // this is the fab-floor "re-entrant loop" read on real rework data
          const backward = a.tx < a.sx
          const bowY = Math.min(a.sy, a.ty) - 140
          const d = backward
            ? `M ${a.sx},${a.sy} C ${a.sx + 60},${bowY} ${a.tx - 60},${bowY} ${a.tx},${a.ty}`
            : `M ${a.sx},${a.sy} C ${mx},${a.sy} ${mx},${a.ty} ${a.tx},${a.ty}`
          const labelX = mx
          const labelY = backward ? bowY + 2 : (a.sy + a.ty) / 2 - 9
          const width = Math.min(2.5 + a.count * 0.7, 7)
          const dur = Math.max(1.4, 4.2 - a.count * 0.35)
          return (
            <g key={a.id}>
              {/* soft glow underlay — the belt's aura */}
              <path d={d} fill="none" stroke={color} strokeWidth={width + 7} strokeOpacity={0.1} strokeLinecap="round" />
              {/* the dashed belt track */}
              <path d={d} fill="none" stroke={color} strokeWidth={width} strokeOpacity={0.32} strokeLinecap="round" strokeDasharray="1 9" />
              {/* the belt line + arrowhead */}
              <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeOpacity={0.85} markerEnd={marker} />
              {/* parts riding the belt */}
              <rect x={-4} y={-4} width={8} height={8} rx={2} fill={color} stroke="#0b0c0e" strokeWidth={0.75}>
                <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={d} rotate="auto" />
              </rect>
              <rect x={-3} y={-3} width={6} height={6} rx={1.5} fill={color} fillOpacity={0.6}>
                <animateMotion dur={`${dur}s`} begin={`${dur / 2}s`} repeatCount="indefinite" path={d} rotate="auto" />
              </rect>
              {/* how many parts actually took this route */}
              <text
                x={labelX}
                y={labelY}
                fill={a.red ? '#fca5a5' : '#6ee7b7'}
                fontSize={11}
                fontWeight={800}
                textAnchor="middle"
                style={{ paintOrder: 'stroke', stroke: '#0b0c0e', strokeWidth: 3.5, letterSpacing: '0.02em' }}
              >
                {a.count}×
              </text>
            </g>
          )
        })}
      </svg>
    </ViewportPortal>
  )
}

// one KPI in the command bar
function Kpi({
  label, value, unit, tone, progress,
}: {
  label: string; value: string | number; unit?: string
  tone?: 'warn' | 'bad'; progress?: number
}) {
  const valColor = tone === 'bad' ? 'text-[#fca5a5]' : tone === 'warn' ? 'text-[#fcd34d]' : 'text-white'
  return (
    <div className="min-w-[116px] rounded-xl border border-white/10 bg-[#1b1b1e] px-3.5 py-2.5">
      <p className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-[#6e6e73]">{label}</p>
      <p className={`mt-1 font-mono text-[1.35rem] font-extrabold leading-none tabular-nums ${valColor}`}>
        {value}
        {unit && <span className="ml-1 font-sans text-[0.72rem] font-semibold text-[#a1a1a6]">{unit}</span>}
      </p>
      {progress != null && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#34d399]" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </div>
  )
}

export function FloorView() {
  const { stations, flows, isLoading, error, canPersist, isLive, reload, savePosition } =
    useFloorData()

  // where the manager has dragged things this session. keeping it separate from the
  // fetched data means a realtime refresh can't yank a node out from under the cursor.
  const [dragged, setDragged] = useState<Record<string, { x: number; y: number }>>({})
  const [openStation, setOpenStation] = useState<FloorStation | null>(null)
  const rf = useRef<ReactFlowInstance<WorkstationNodeType> | null>(null)

  // one source of truth for every station's position (dragged > saved > auto-line).
  // both the nodes AND the hand-drawn belts read from this, so they can never drift.
  //
  // Un-positioned stations (e.g. ones created before the layout was saved) are APPENDED
  // to the right of the saved line rather than dropped at index 0,1,2 — otherwise they'd
  // land straight on top of a seeded production line. This keeps the floor a clean single
  // row on first load, before anyone touches "Tidy into line".
  const positionById = useMemo(() => {
    const savedYs: number[] = []
    let maxSavedX = LINE_X0 - LINE_STEP
    for (const s of stations) {
      if (s.posX !== null && s.posY !== null) {
        savedYs.push(s.posY)
        if (s.posX > maxSavedX) maxSavedX = s.posX
      }
    }
    const rowY = savedYs.length ? savedYs[0] : LINE_Y

    const m: Record<string, { x: number; y: number }> = {}
    let autoSlot = 0
    for (const s of stations) {
      if (dragged[s.id]) {
        m[s.id] = dragged[s.id]
      } else if (s.posX !== null && s.posY !== null) {
        m[s.id] = { x: s.posX, y: s.posY }
      } else {
        autoSlot += 1
        m[s.id] = { x: maxSavedX + autoSlot * LINE_STEP, y: rowY }
      }
    }
    return m
  }, [stations, dragged])

  // STEP ORDER. Only stations that take part in the flow get a number, ranked
  // left-to-right, so the badges read 1 -> 2 -> 3 down the line. Stations with no traffic
  // stay unnumbered, which visibly marks them as off-line.
  const stepById = useMemo(() => {
    const inFlow = new Set<string>()
    for (const f of flows) {
      inFlow.add(f.from)
      inFlow.add(f.to)
    }
    const ranked = stations
      .filter((s) => inFlow.has(s.id))
      .map((s) => ({ id: s.id, x: positionById[s.id]?.x ?? 0 }))
      .sort((a, b) => a.x - b.x)

    const map: Record<string, number> = {}
    ranked.forEach((s, i) => {
      map[s.id] = i + 1
    })
    return map
  }, [stations, flows, positionById])

  // a station is a "re-entry point" if a rework loop feeds BACK into it — i.e. some route
  // arrives from a station further down the line. That's the QA -> Assembly story.
  const reentryIds = useMemo(() => {
    const set = new Set<string>()
    for (const f of flows) {
      const fromStep = stepById[f.from]
      const toStep = stepById[f.to]
      if (fromStep != null && toStep != null && fromStep > toStep) set.add(f.to)
    }
    return set
  }, [flows, stepById])

  const nodes = useMemo<WorkstationNodeType[]>(
    () =>
      stations.map((station) => ({
        id: station.id,
        type: 'workstation' as const,
        position: positionById[station.id],
        // Explicit dimensions: React Flow keeps a node `visibility: hidden` until a
        // ResizeObserver measures it, and in this React 19 / Next setup that never fires.
        // Declaring the size makes RF treat the node as measured and render it.
        width: NODE_W,
        height: NODE_H,
        data: {
          ...station,
          step: stepById[station.id],
          reentry: reentryIds.has(station.id),
        } as WorkstationNodeData,
      })),
    [stations, positionById, stepById, reentryIds],
  )

  // the belts, anchored to the right edge of the source and the left edge of the target
  const arrows = useMemo<Arrow[]>(
    () =>
      flows
        .map((f) => {
          const s = positionById[f.from]
          const t = positionById[f.to]
          if (!s || !t) return null
          return {
            id: f.id,
            sx: s.x + NODE_W,
            sy: s.y + NODE_H / 2,
            tx: t.x,
            ty: t.y + NODE_H / 2,
            red: f.carriedFlagged,
            count: f.count,
          }
        })
        .filter((a): a is Arrow => a !== null),
    [flows, positionById],
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

  // "Tidy into line" — snap every station into the clean assembly line, in running order,
  // then re-fit. Positions still persist, and the manager can drag anything afterwards.
  const tidy = useCallback(() => {
    const ordered = [...stations].sort(
      (a, b) =>
        (stepById[a.id] ?? 999) - (stepById[b.id] ?? 999) || a.name.localeCompare(b.name),
    )
    const next: Record<string, { x: number; y: number }> = {}
    ordered.forEach((s, i) => {
      next[s.id] = { x: i * LINE_STEP + LINE_X0, y: LINE_Y }
    })
    setDragged(next)
    ordered.forEach((s, i) => savePosition(s.id, i * LINE_STEP + LINE_X0, LINE_Y))
    requestAnimationFrame(() => rf.current?.fitView({ padding: 0.2, duration: 500 }))
  }, [stations, stepById, savePosition])

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

  // the bottleneck = the active station with the most parts piled on it
  const bottleneck = useMemo(() => {
    let best: FloorStation | null = null
    for (const s of stations) {
      if (!s.isActive) continue
      if (!best || s.total > best.total) best = s
    }
    return best && best.total > 0 ? best : null
  }, [stations])

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
      <div className="h-[640px] rounded-2xl border border-white/10 bg-[#131315] flex items-center justify-center">
        <p className="text-[#6e6e73] animate-pulse">Mapping the factory floor…</p>
      </div>
    )
  }

  if (stations.length === 0) {
    return (
      <div className="h-[400px] rounded-2xl border border-dashed border-white/10 bg-[#131315] flex flex-col items-center justify-center text-center px-8">
        <p className="font-bold text-[#f5f5f7] mb-1">No workstations yet</p>
        <p className="text-sm text-[#6e6e73]">
          Add stations in the Workstation Manager and they will appear here automatically.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* KPI command bar */}
      <div className="flex flex-wrap items-stretch gap-2.5">
        <Kpi label="On the floor" value={totals.onFloor} unit="parts" />
        <Kpi label="Live routes" value={flows.length} unit={flows.length === 1 ? 'path' : 'paths'} />
        <div className="min-w-[150px] rounded-xl border border-white/10 bg-[#1b1b1e] px-3.5 py-2.5">
          <p className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-[#6e6e73]">Bottleneck</p>
          <p className="mt-1 truncate text-[1.05rem] font-extrabold leading-tight text-[#fcd34d]">
            {bottleneck ? bottleneck.name : '—'}
          </p>
          {bottleneck && (
            <p className="text-[0.62rem] text-[#6e6e73]">{bottleneck.total} parts waiting</p>
          )}
        </div>
        <Kpi label="Flagged" value={totals.flagged} tone={totals.flagged > 0 ? 'bad' : undefined} />
        <Kpi label="Overdue" value={totals.overdue} tone={totals.overdue > 0 ? 'warn' : undefined} />

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={tidy}
            title="Snap all stations into a clean production line (you can still drag them after)"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#232326] px-3 py-2 text-xs font-semibold text-[#e9eff6] transition-colors hover:border-[#6ee7b7]/50 hover:text-[#6ee7b7]"
          >
            <Wand2 size={14} /> Tidy into line
          </button>
          <div className="flex items-center gap-1.5 text-xs">
            <Radio size={12} className={isLive ? 'text-emerald-400' : 'text-slate-600'} />
            <span className={isLive ? 'text-emerald-400' : 'text-slate-500'}>{isLive ? 'Live' : 'Not live'}</span>
            <button
              onClick={reload}
              title="Refresh"
              className="ml-1 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* only shows up when the migration hasn't been run */}
      {!canPersist && (
        <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          Layout changes are not being saved. Run <code className="font-mono">supabase/floor_view.sql</code>{' '}
          to add the position columns, and your arrangement will stick between visits.
        </p>
      )}

      {/* the floor — a calm dark bay; the stations + belts are the whole story */}
      <div className="h-[640px] rounded-2xl border border-white/10 overflow-hidden factory-floor">
        <ReactFlow
          nodes={nodes}
          edges={[] as Edge[]}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={(_e, node) => {
            const s = stations.find((x) => x.id === node.id)
            if (s) setOpenStation(s)
          }}
          onInit={(instance) => {
            rf.current = instance
          }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.6}
          proOptions={{ hideAttribution: false }}
          style={{ background: 'transparent' }}
        >
          {/* the belts, drawn by hand in viewport space (see Belts) */}
          <Belts arrows={arrows} />
          {/* faint painted floor grid — big tiles, so it reads as a floor not graph paper */}
          <Background variant={BackgroundVariant.Lines} gap={64} size={1} color="rgba(255,255,255,0.028)" />
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

      {/* legend — the fab-floor "how to read this floor", in the app's own vocabulary */}
      <div className="rounded-2xl border border-white/10 bg-[#131315] px-4 py-3">
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-[0.78rem] text-[#a1a1a6] sm:grid-cols-2 lg:grid-cols-3">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded border-2 border-[#f87171]" />
            <span><b className="font-bold text-white">Red station</b> — a defect is sitting here right now.</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded border-2 border-[#fbbf24]" />
            <span><b className="font-bold text-white">Amber station</b> — a part here is past its deadline.</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded border-2 border-[#34d399]/70" />
            <span><b className="font-bold text-white">Green</b> — running, or the final station.</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/25 bg-[#0c0d0f] text-[9px] font-black text-white">1</span>
            <span><b className="font-bold text-white">Big number = parts here.</b> Badges number the running order.</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-base font-black text-[#6ee7b7]">→</span>
            <span><b className="font-bold text-white">Belts = real routes</b> parts took, from scan history. <span className="text-[#6e6e73]">N× = how many.</span></span>
          </span>
          <span className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-sm font-black text-[#6ee7b7]">⟲</span>
            <span><b className="font-bold text-white">Loop back = rework.</b> Click any station to see its parts.</span>
          </span>
        </div>
      </div>

      {openStation && <BayDrawer station={openStation} onClose={() => setOpenStation(null)} />}
    </div>
  )
}
