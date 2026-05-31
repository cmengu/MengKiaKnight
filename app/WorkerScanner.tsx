'use client'
  import { useState } from 'react'
  import { supabase } from '@/lib/supabase'
  import { logout } from '@/app/actions/auth'
  import type { Database } from '@/types/database'
  
  type StatusType = Database['public']['Tables']['components']['Row']['current_status']
  
  export function WorkerScanner() {
    const [status, setStatus] = useState<StatusType>('pending')
    
    const updateStatus = async () => {
      const { error } = await supabase
        .from('components')
        .update({ current_status: 'in_progress' })
        .eq('id', 'c119ed50-f377-416e-83be-2af85dc2e8d6')
      if (!error) setStatus('in_progress')
    } 
    
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-slate-900 gap-1">
        <h1 className="text-white text-3xl font-bold">MPT Component Scanner</h1>
        <p className="text-slate-300 text-lg">Current Status: {status}</p>
        <button onClick={updateStatus} className="bg-blue-600 text-white font-bold py-3 p-3 rounded-lg hover:bg-blue-700">
          'Scan QR' to Update to In Progress
        </button>
        <button onClick={() => logout()} className="mt-8 text-slate-400 underline hover:text-slate-200">
          Logout
        </button>
      </main>
    )
  }