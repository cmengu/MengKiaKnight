'use client'

import { type NodeProps, type Node } from '@xyflow/react'
import { PackageCheck, RotateCcw } from 'lucide-react'
import type { FloorStation } from '@/hooks/useFloorData'

// `step` is derived on the map (stations ordered left-to-right along the line), so a
// worker or manager can read the sequence off the badges: 1 -> 2 -> 3 -> ...
// `reentry` is set when a rework loop feeds back INTO this station (e.g. QA -> Assembly),
// so it can wear the same "re-entry point" badge the fab-floor design uses.
export type WorkstationNodeData = FloorStation & {
  step?: number
  reentry?: boolean
} & Record<string, unknown>
export type WorkstationNodeType = Node<WorkstationNodeData, 'workstation'>

// One "tone" per floor condition. Worst problem wins, so a station never hides a defect
// behind a friendlier colour. These are concrete hexes (not theme classes) because the
// SVG belts, LED glows and drop-shadows all need the raw value, and keeping them in one
// place means the card and its belt can never disagree on what "amber" is.
type Tone = {
  key: 'defect' | 'late' | 'final' | 'run' | 'off'
  label: string
  color: string // stripe / LED / accent
  glow: string // LED halo + card aura
  border: string
  num: string // big WIP number colour
  chipBg: string
  chipFg: string
  chipBorder: string
}

const TONES: Record<Tone['key'], Tone> = {
  defect: {
    key: 'defect', label: 'Defect here', color: '#f87171', glow: 'rgba(248,113,113,0.35)',
    border: '#f87171', num: '#fca5a5',
    chipBg: 'rgba(248,113,113,0.14)', chipFg: '#fca5a5', chipBorder: 'rgba(248,113,113,0.45)',
  },
  late: {
    key: 'late', label: 'Running late', color: '#fbbf24', glow: 'rgba(251,191,36,0.30)',
    border: '#fbbf24', num: '#fcd34d',
    chipBg: 'rgba(251,191,36,0.14)', chipFg: '#fcd34d', chipBorder: 'rgba(251,191,36,0.45)',
  },
  final: {
    key: 'final', label: 'Final station', color: '#34d399', glow: 'rgba(52,211,153,0.28)',
    border: 'rgba(52,211,153,0.7)', num: '#f5f5f7',
    chipBg: 'rgba(52,211,153,0.14)', chipFg: '#6ee7b7', chipBorder: 'rgba(52,211,153,0.45)',
  },
  run: {
    key: 'run', label: 'Running', color: '#34d399', glow: 'rgba(52,211,153,0.22)',
    border: 'rgba(255,255,255,0.16)', num: '#f5f5f7',
    chipBg: 'rgba(52,211,153,0.12)', chipFg: '#6ee7b7', chipBorder: 'rgba(52,211,153,0.35)',
  },
  off: {
    key: 'off', label: 'Offline', color: '#6e6e73', glow: 'transparent',
    border: 'rgba(255,255,255,0.10)', num: '#6e6e73',
    chipBg: 'rgba(110,110,115,0.14)', chipFg: '#a1a1a6', chipBorder: 'rgba(110,110,115,0.4)',
  },
}

function toneFor(d: FloorStation): Tone {
  if (!d.isActive) return TONES.off
  if (d.flagged > 0) return TONES.defect
  if (d.overdue > 0) return TONES.late
  if (d.isFinal) return TONES.final
  return TONES.run
}

/**
 * One station on the factory floor, drawn as the fab-floor "bay" card: a chunky 2.5D
 * block whose whole job is to be readable at a glance across a room. The colour IS the
 * status, the big number is the answer to "how much is stuck here", and the chip spells
 * out the one-word state. Clicking it opens the bay (handled by the map).
 *
 * It still lives inside a React Flow node, so it stays draggable and the hand-drawn
 * belts anchor to its edges — the card just wears the new skin.
 */
export function WorkstationNode({ data, selected }: NodeProps<WorkstationNodeType>) {
  const tone = toneFor(data)
  const pulsing = data.isActive && data.flagged > 0

  return (
    <div
      className="group relative flex h-[150px] w-[212px] cursor-pointer flex-col rounded-2xl px-3.5 pb-3 pt-3 text-left transition-transform duration-150 hover:-translate-y-[3px]"
      style={{
        background: 'linear-gradient(180deg, #232326 0%, #161618 100%)',
        border: `1.5px solid ${tone.border}`,
        boxShadow: `0 5px 0 -1px rgba(0,0,0,0.35), 0 16px 28px -14px rgba(0,0,0,0.75), 0 0 26px ${tone.glow}, inset 0 1px 0 0 rgba(255,255,255,0.06)`,
        outline: selected ? '2px solid rgba(255,255,255,0.4)' : 'none',
        outlineOffset: 2,
      }}
    >
      {/* re-entry badge — a rework loop feeds back into this station */}
      {data.reentry && (
        <span
          className="absolute -top-2.5 right-3 z-20 inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[9px] font-extrabold uppercase tracking-wider"
          style={{ color: tone.color, borderColor: tone.color, background: '#131315' }}
        >
          <RotateCcw size={9} /> re-entry
        </span>
      )}

      {/* STEP badge — reading 1 -> 2 -> 3 tells you the running order down the line */}
      {typeof data.step === 'number' && (
        <div className="absolute -left-2.5 -top-2.5 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/25 bg-[#0c0d0f] text-[11px] font-black text-white shadow-lg">
          {data.step}
        </div>
      )}

      {/* left status stripe — the block's lit edge */}
      <span
        className="absolute bottom-3 left-0 top-3 w-[4px] rounded-r"
        style={{ background: tone.color }}
      />

      {/* head: name + where it is, and the powered-on status LED */}
      <div className="ml-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[0.92rem] font-extrabold leading-tight tracking-tight text-white">
            {data.name}
          </p>
          <p className="mt-[1px] truncate text-[0.63rem] uppercase tracking-wide text-[#6e6e73]">
            {data.location || (data.isQa ? 'QA checkpoint' : 'Workstation')}
          </p>
        </div>
        <span className="relative mt-1 flex h-[9px] w-[9px] shrink-0">
          {pulsing && (
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ background: tone.color }}
            />
          )}
          <span
            className="relative inline-flex h-[9px] w-[9px] rounded-full"
            style={{ background: tone.color, boxShadow: `0 0 0 4px ${tone.glow}` }}
          />
        </span>
      </div>

      {/* the headline number: how many parts are physically standing at this station */}
      <div className="ml-2 mt-2 flex items-baseline gap-1.5">
        <span
          className="font-mono text-[2rem] font-extrabold leading-none tracking-tight tabular-nums"
          style={{ color: tone.num }}
        >
          {data.total}
        </span>
        <span className="text-[0.68rem] font-semibold text-[#a1a1a6]">
          {data.total === 1 ? 'part' : 'parts'}
        </span>
        {/* a small breakdown, echoing the POC's "N lots · M tools up" meta line */}
        <span className="ml-auto mr-1 text-[0.64rem] text-[#6e6e73]">
          {data.inProgress > 0 && <span className="text-[#a1a1a6]">{data.inProgress} active</span>}
          {data.inProgress > 0 && data.pending > 0 && <span className="px-1">·</span>}
          {data.pending > 0 && <span className="text-[#a1a1a6]">{data.pending} waiting</span>}
          {data.total === 0 && <span className="italic">idle</span>}
        </span>
      </div>

      {/* foot: the one-word state, and the drill-in affordance */}
      <div className="ml-2 mt-auto flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[0.6rem] font-extrabold uppercase tracking-wide"
          style={{ background: tone.chipBg, color: tone.chipFg, borderColor: tone.chipBorder }}
        >
          {tone.key === 'final' && <PackageCheck size={10} />}
          {data.flagged > 0 ? `${data.flagged} flagged` : data.overdue > 0 ? `${data.overdue} late` : tone.label}
        </span>
        <span className="text-[0.64rem] font-bold text-[#6ee7b7] opacity-70 transition-opacity group-hover:opacity-100">
          open&nbsp;&rarr;
        </span>
      </div>
    </div>
  )
}
