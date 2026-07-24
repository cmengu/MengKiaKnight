'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, PackageCheck, ShieldCheck, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { STATUS_LABELS, isComponentStatus, type ComponentStatus } from '@/lib/services/statusTransitions'
import type { FloorStation } from '@/hooks/useFloorData'

// exactly the columns the list needs. updated_at stands in for "last touched here",
// which is all the drawer claims — the full per-part timeline lives in HistoryDrawer.
type BayPart = {
  id: string
  name: string
  current_status: string
  deadline: string | null
  updated_at: string | null
}

const STATUS_STYLE: Record<ComponentStatus, { fg: string; bg: string; border: string }> = {
  pending:     { fg: '#a1a1a6', bg: 'rgba(110,110,115,0.14)', border: 'rgba(110,110,115,0.4)' },
  in_progress: { fg: '#93c5fd', bg: 'rgba(96,165,250,0.14)',  border: 'rgba(96,165,250,0.4)' },
  completed:   { fg: '#6ee7b7', bg: 'rgba(52,211,153,0.14)',  border: 'rgba(52,211,153,0.4)' },
  flagged:     { fg: '#fca5a5', bg: 'rgba(248,113,113,0.16)', border: 'rgba(248,113,113,0.45)' },
}

function statusLabel(raw: string) {
  return isComponentStatus(raw) ? STATUS_LABELS[raw] : raw.replace('_', ' ')
}
function statusStyle(raw: string) {
  return isComponentStatus(raw) ? STATUS_STYLE[raw] : STATUS_STYLE.pending
}

/** "in 3h" / "2h ago" — short, human, and never a raw timestamp. */
function relTime(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.parse(iso) - Date.now()
  const past = diff < 0
  const mins = Math.round(Math.abs(diff) / 60000)
  const val = mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.round(mins / 60)}h` : `${Math.round(mins / 1440)}d`
  return past ? `${val} ago` : `in ${val}`
}

// kept as a module helper (not an inline `Date.now()` in render) so it stays out of the
// component's purity scope — the same reason relTime lives up here.
function isOverdue(deadline: string | null, status: string): boolean {
  return deadline !== null && Date.parse(deadline) < Date.now() && status !== 'completed'
}

/**
 * Opening a bay: what's actually standing at this station right now. This is the drill-in
 * the flat map never had — the map tells you a station has 4 parts and one's flagged; the
 * drawer tells you WHICH parts, what state they're in, and which one is about to blow its
 * deadline.
 */
export function BayDrawer({ station, onClose }: { station: FloorStation; onClose: () => void }) {
  const [parts, setParts] = useState<BayPart[]>([])
  const [loading, setLoading] = useState(true)
  // enter animation — mount off-screen, then slide in on the next frame
  const [shown, setShown] = useState(false)

  useEffect(() => {
    // defer to the next frame so the panel paints at translateX(100%) first, then slides
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    let alive = true
    supabase
      .from('components')
      .select('id, name, current_status, deadline, updated_at')
      .eq('current_workstation_id', station.id)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        if (!alive) return
        setParts((data ?? []) as BayPart[])
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [station.id])

  // close on Escape, like the rest of the app's overlays
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const attention = station.flagged > 0

  return (
    <div className="fixed inset-0 z-50">
      {/* scrim */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
        style={{ opacity: shown ? 1 : 0 }}
      />

      {/* panel */}
      <aside
        role="dialog"
        aria-label={`${station.name} detail`}
        className="absolute right-0 top-0 flex h-full w-[min(440px,94vw)] flex-col border-l border-white/10 bg-[#131315] shadow-2xl transition-transform duration-300"
        style={{
          transform: shown ? 'translateX(0)' : 'translateX(100%)',
          boxShadow: '-24px 0 60px -20px rgba(0,0,0,0.7)',
        }}
      >
        {/* header */}
        <div className="border-b border-white/10 px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[#6e6e73]">
                {attention ? (
                  <span className="text-[#fca5a5]">⚠ Attention · Process bay</span>
                ) : (
                  'Process bay'
                )}
              </p>
              <h3 className="mt-1 text-xl font-extrabold text-white">{station.name}</h3>
              <p className="mt-0.5 flex items-center gap-2 text-[0.78rem] text-[#a1a1a6]">
                {station.location || 'Workstation'}
                {station.isQa && (
                  <span className="inline-flex items-center gap-1 text-[#93c5fd]">
                    <ShieldCheck size={12} /> QA
                  </span>
                )}
                {station.isFinal && (
                  <span className="inline-flex items-center gap-1 text-[#6ee7b7]">
                    <PackageCheck size={12} /> Final
                  </span>
                )}
                {!station.isActive && <span className="text-[#6e6e73]">· offline</span>}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/15 bg-[#232326] text-[#a1a1a6] transition-colors hover:border-white/30 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          {/* stat tiles */}
          <div className="mt-4 flex gap-2">
            {[
              { l: 'On station', v: station.total },
              { l: 'Active', v: station.inProgress },
              { l: 'Waiting', v: station.pending },
              { l: 'Flagged', v: station.flagged, danger: station.flagged > 0 },
            ].map((s) => (
              <div key={s.l} className="flex-1 rounded-xl border border-white/10 bg-[#1b1b1e] px-2.5 py-2">
                <p className="text-[0.54rem] font-bold uppercase tracking-wider text-[#6e6e73]">{s.l}</p>
                <p
                  className="mt-0.5 font-mono text-lg font-extrabold tabular-nums"
                  style={{ color: s.danger ? '#fca5a5' : '#f5f5f7' }}
                >
                  {s.v}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* body — the parts standing here */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-3 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[#6e6e73]">
            Parts on this station
          </p>

          {loading ? (
            <p className="mt-8 animate-pulse text-center text-sm text-[#6e6e73]">Reading the station…</p>
          ) : parts.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-[#a1a1a6]">Nothing here right now</p>
              <p className="mt-1 text-xs text-[#6e6e73]">This station is idle — no parts are sitting on it.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {parts.map((p) => {
                const st = statusStyle(p.current_status)
                const overdue = isOverdue(p.deadline, p.current_status)
                return (
                  <div key={p.id} className="rounded-xl border border-white/10 bg-[#1b1b1e] px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[0.86rem] font-bold text-white">{p.name}</span>
                      <span
                        className="shrink-0 rounded-full border px-2 py-[2px] text-[0.58rem] font-extrabold uppercase tracking-wide"
                        style={{ color: st.fg, background: st.bg, borderColor: st.border }}
                      >
                        {statusLabel(p.current_status)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[0.7rem] text-[#6e6e73]">
                      {p.deadline ? (
                        <span
                          className="inline-flex items-center gap-1 font-semibold"
                          style={{ color: overdue ? '#fca5a5' : '#a1a1a6' }}
                        >
                          {overdue ? <AlertTriangle size={11} /> : <Clock size={11} />}
                          {overdue ? `Overdue ${relTime(p.deadline)}` : `Due ${relTime(p.deadline)}`}
                        </span>
                      ) : (
                        <span className="italic">no deadline</span>
                      )}
                      <span className="ml-auto">updated {relTime(p.updated_at)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
