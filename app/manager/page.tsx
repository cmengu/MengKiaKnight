'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { logout } from '@/app/actions/auth'
import type { Database } from '@/types/database'
import { WorkstationManager } from '@/app/_components/WorkstationManager'
  
type Component = Database['public']['Tables']['components']['Row']
  
export default function ManagerDashboard() {
const [componentsList, setComponentsList] = useState<Component[]>([])
    
useEffect(() => {
    const fetchComponents = async () => {
    const { data, error } = await supabase.from('components').select('*')
    if (!error) setComponentsList(data)
     } 
     fetchComponents()
 }, [])
 
 return (
   <main className="flex flex-col items-center justify-center min-h-screen bg-slate-600 gap-4 p-8">
     <h1 className="text-3xl font-bold text-emerald-400 mb-6">Manager Dashboard</h1>
     <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 w-full max-w-2xl">
       <h2 className="text-xl text-white font-bold mb-4">Live Factory Components</h2>
       <div className="flex flex-col gap-3">
         {componentsList.length === 0 ? (
           <p className="text-slate-400 text-center py-4">No components found or still loading...</p>
         ) : (
           componentsList.map((item) => (
             <div key={item.id} className="flex justify-between bg-slate-700 p-4 rounded-lg items-center">              
                 <span className="font-mono text-slate-300 text-sm">Component Name: {item.name}</span>
                 <span className="font-bold text-amber-400 uppercase tracking-wider text-sm">{item.current_status}</span>
               </div>
             ))
           )}
         </div>
       </div>
       <WorkstationManager />
       <a href="/manager/ask" className="text-emerald-400 underline">Ask your factory →</a>.
       <button onClick={() => logout()} className="mt-8 text-slate-400 underline hover:text-slate-200">
          Logout
       </button>
     </main>
   )
 }