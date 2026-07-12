'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type PendingWorker = {
  id: string
  user_name: string | null
  email_account: string | null
  role: string
  status: string
}

export function WorkerApprovals() {
  const [workers, setWorkers] = useState<PendingWorker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  // 1. Fetch pending registrations on load
  useEffect(() => {
    fetchPending()
  }, [])

  const fetchPending = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, user_name, email_account, role, status')
      .eq('status', 'pending')

    if (error) alert(`Error loading pending workers: ${error.message}`)
    if (data) setWorkers(data)
    setIsLoading(false)
  }

  // 2. Approve or reject — RLS only lets managers do this update
  const handleDecision = async (id: string, decision: 'approved' | 'rejected') => {
    setActingId(id)
    const { error } = await supabase
      .from('user_profiles')
      .update({ status: decision })
      .eq('id', id)

    if (error) {
      alert(`Failed to ${decision === 'approved' ? 'approve' : 'reject'}: ${error.message}`)
    } else {
      // remove from ui immediately
      setWorkers(workers.filter(w => w.id !== id))
    }
    setActingId(null)
  }

  return (
    <div className="bg-surface-raised bg-gradient-to-b from-white/[0.045] to-transparent rounded-xl border border-border-subtle shadow-card hover:border-border-strong transition-colors duration-200 overflow-hidden">
      <div className="p-4 border-b border-border-subtle flex justify-between items-center">
        <h3 className="text-lg text-fg font-bold">Pending Registrations</h3>
        <span className="text-fg-secondary text-sm">{workers.length} awaiting review</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-base/50 text-fg-secondary text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Email</th>
              <th className="p-4 font-semibold text-right">Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {isLoading ? (
              <tr><td colSpan={3} className="p-8 text-center text-fg-muted">Loading pending workers...</td></tr>
            ) : workers.length === 0 ? (
              <tr><td colSpan={3} className="p-8 text-center text-fg-muted">No workers awaiting approval.</td></tr>
            ) : workers.map((worker) => (
              <tr key={worker.id} className="hover:bg-surface-hover transition-colors">
                <td className="p-4 font-bold text-fg">{worker.user_name || '-'}</td>
                <td className="p-4 text-fg-secondary">{worker.email_account || '-'}</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => handleDecision(worker.id, 'approved')}
                      disabled={actingId === worker.id}
                      className="text-sm font-bold text-white bg-brand hover:bg-brand-hover transition-all px-4 py-2 rounded-lg shadow-[0_0_14px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.35)] disabled:opacity-50 active:scale-95"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecision(worker.id, 'rejected')}
                      disabled={actingId === worker.id}
                      className="text-sm font-bold text-danger hover:bg-danger/10 border border-danger/20 transition-all px-4 py-2 rounded-lg disabled:opacity-50 active:scale-95"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
