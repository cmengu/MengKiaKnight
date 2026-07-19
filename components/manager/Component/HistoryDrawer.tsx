'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ComponentItem } from './ComponentManager'

interface Props {
  item: ComponentItem | null;
  onClose: () => void;
}

// exactly the 4 cols the select below asks for, nothing else. timestamp is nullable
// in the db, so the timeline has to cope with that.
type HistoryLog = {
  timestamp: string | null
  to_status: string
  updated_by: string | null
  workstation_name: string | null
}

export function HistoryDrawer({ item, onClose }: Props) {
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Fetch the logs automatically when the item is passed in
  useEffect(() => {
    if (!item) return;

    const fetchHistory = async () => {
      setIsLoadingHistory(true)
      const { data, error } = await supabase
        .from('status_logs')
        .select(`timestamp, updated_by, to_status, workstation_name`)
        .eq('component_id', item.id)
        .order('timestamp', { ascending: false })

      if (error) console.error('History fetch error:', error)
      if (data) setHistoryLogs(data)
      setIsLoadingHistory(false)
    }

    fetchHistory()
  }, [item])

  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-slate-800 border-l border-slate-700 w-full max-w-md h-full p-6 shadow-2xl overflow-y-auto transform transition-transform">
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
          <h3 className="text-xl font-bold text-white">Timeline: {item.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        {isLoadingHistory ? (
          <p className="text-slate-400 text-center mt-10">Fetching logs...</p>
        ) : historyLogs.length === 0 ? (
          <p className="text-slate-400 text-center mt-10">No scans recorded yet.</p>
        ) : (
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-700">
            {historyLogs.map((log, idx) => (
              <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-600 bg-slate-800 text-slate-300 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                  {log.to_status === 'completed' ? '🏁' : log.to_status === 'defect' ? '⚠️' : '📍'}
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-900 p-4 rounded-xl border border-slate-700 shadow">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-white uppercase text-xs tracking-wider">{log.to_status.replace('_', ' ')}</div>
                    <time className="text-xs font-medium text-amber-400">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}</time>
                  </div>
                  <div className="text-sm text-slate-300 mb-2">{log.workstation_name || 'Manager Override'}</div>
                  <div className="text-xs text-slate-500">Operated by: {log.updated_by}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}