'use client'

import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { AlertTriangle, Clock, Flag, PackageCheck } from 'lucide-react'
import type { FloorStation } from '@/hooks/useFloorData'

export type WorkstationNodeData = FloorStation & Record<string, unknown>
export type WorkstationNodeType = Node<WorkstationNodeData, 'workstation'>

/**
 * One box on the factory floor.
 *
 * The colour IS the alert — you shouldn't have to read the numbers to know something's
 * wrong. Red = a defect is sitting here, amber = something here is late, green = the
 * end of the line, grey = quiet. Anything red also gets a pulsing ring so it catches
 * your eye from across the room, which is the whole point of a wall display.
 */
export function WorkstationNode({ data, selected }: NodeProps<WorkstationNodeType>) {
  const hasDefect = data.flagged > 0
  const isLate = data.overdue > 0

  // worst problem wins the colour
  const tone = !data.isActive
    ? {
        ring: 'border-slate-700/60',
        glow: '',
        accent: 'text-slate-500',
        chip: 'bg-slate-700/40 text-slate-400 border-slate-600/40',
      }
    : hasDefect
    ? {
        ring: 'border-red-500',
        glow: 'shadow-[0_0_28px_rgba(239,68,68,0.45)]',
        accent: 'text-red-400',
        chip: 'bg-red-500/15 text-red-300 border-red-500/40',
      }
    : isLate
    ? {
        ring: 'border-amber-500',
        glow: 'shadow-[0_0_24px_rgba(245,158,11,0.35)]',
        accent: 'text-amber-400',
        chip: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      }
    : data.isFinal
    ? {
        ring: 'border-emerald-500/70',
        glow: 'shadow-[0_0_22px_rgba(16,185,129,0.28)]',
        accent: 'text-emerald-400',
        chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
      }
    : {
        ring: 'border-slate-600',
        glow: '',
        accent: 'text-slate-300',
        chip: 'bg-slate-700/50 text-slate-300 border-slate-600/50',
      }

  return (
    <div
      className={`relative w-[212px] rounded-2xl border-2 bg-slate-900/95 backdrop-blur px-4 py-3
        transition-all duration-200 ${tone.ring} ${tone.glow}
        ${selected ? 'ring-2 ring-white/40' : ''}`}
    >
      {/* the pulse — only for genuine problems, so it never becomes wallpaper */}
      {data.isActive && hasDefect && (
        <span className="pointer-events-none absolute -inset-1 rounded-2xl border-2 border-red-500/60 animate-ping" />
      )}

      {/* edges dock here. left = parts arriving, right = parts leaving. */}
      <Handle type="target" position={Position.Left} className="!bg-slate-500 !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Right} className="!bg-slate-500 !w-2 !h-2 !border-0" />

      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-bold text-white text-sm leading-tight truncate">{data.name}</p>
          {data.location && (
            <p className="text-[11px] text-slate-500 truncate">{data.location}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {data.isFinal && (
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-emerald-500/15 text-emerald-300 border-emerald-500/40">
              <PackageCheck size={9} /> Final
            </span>
          )}
          {data.isQa && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-sky-500/15 text-sky-300 border-sky-500/40">
              QA
            </span>
          )}
          {!data.isActive && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-slate-700/40 text-slate-400 border-slate-600/40">
              Off
            </span>
          )}
        </div>
      </div>

      {/* the headline number: how many parts are standing here right now */}
      <div className="flex items-end gap-2 mb-2">
        <span className={`text-3xl font-bold leading-none ${tone.accent}`}>{data.total}</span>
        <span className="text-[11px] text-slate-500 mb-0.5">
          {data.total === 1 ? 'component' : 'components'}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {data.flagged > 0 && (
          <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${tone.chip}`}>
            <Flag size={9} /> {data.flagged} flagged
          </span>
        )}
        {data.overdue > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border bg-amber-500/15 text-amber-300 border-amber-500/40">
            <Clock size={9} /> {data.overdue} late
          </span>
        )}
        {data.inProgress > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-slate-700/50 text-slate-300 border-slate-600/50">
            {data.inProgress} active
          </span>
        )}
        {data.total === 0 && (
          <span className="text-[10px] text-slate-600 italic">idle</span>
        )}
      </div>

      {/* deactivated stations still show up, just visibly switched off */}
      {!data.isActive && (
        <div className="absolute inset-0 rounded-2xl bg-slate-950/50 flex items-center justify-center">
          <AlertTriangle size={16} className="text-slate-600" />
        </div>
      )}
    </div>
  )
}
