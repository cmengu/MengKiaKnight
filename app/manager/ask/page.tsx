// this is the ask page for the manager
//creates a simple interface to ask the database a question and get the results 
'use client'
 import { useState } from 'react'

 export default function AskPage() {
   const [question, setQuestion] = useState('')
   const [sql, setSql] = useState('')
   const [rows, setRows] = useState<Record<string, unknown>[]>([])
   const [error, setError] = useState('')
   const [loading, setLoading] = useState(false)

   async function ask() {
     setLoading(true); setError(''); setSql(''); setRows([])
     try {
       const res = await fetch('/api/ask', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ question }),
       })
       const data = await res.json()
       if (!res.ok) { setError(data.error ?? 'Request failed'); if (data.sql) setSql(data.sql); return }
       setSql(data.sql); setRows(data.rows ?? [])
     } catch {
       setError('Network error')
     } finally {
       setLoading(false)
     }
   }

   const columns = rows[0] ? Object.keys(rows[0]) : []

   return (
     <main className="flex flex-col items-center min-h-screen bg-slate-600 gap-4 p-8">
       <h1 className="text-3xl font-bold text-emerald-400">Ask Your Factory</h1>
       <div className="w-full max-w-2xl flex gap-2">
         <input
           value={question}
           onChange={(e) => setQuestion(e.target.value)}
           onKeyDown={(e) => e.key === 'Enter' && ask()}
           placeholder="e.g. How many components are in each status?"
           className="flex-1 px-3 py-2 rounded bg-slate-700 text-white"
         />
         <button onClick={ask} disabled={loading || !question}
           className="px-4 py-2 rounded bg-emerald-500 font-semibold text-white disabled:opacity-50">
           {loading ? 'Asking…' : 'Ask'}
         </button>
       </div>

       {error && <p className="text-red-400 max-w-2xl">{error}</p>}
       {sql && <pre className="w-full max-w-2xl bg-slate-900 text-emerald-300 text-sm p-3 rounded
 overflow-x-auto">{sql}</pre>}

       {rows.length > 0 && (
         <table className="w-full max-w-2xl bg-slate-800 text-slate-200 text-sm rounded overflow-hidden">
           <thead><tr>{columns.map((c) => <th key={c} className="text-left px-3 py-2
 bg-slate-700">{c}</th>)}</tr></thead>
           <tbody>
             {rows.map((r, i) => (
               <tr key={i} className="border-t border-slate-700">
                 {columns.map((c) => <td key={c} className="px-3 py-2">{String(r[c])}</td>)}
               </tr>
             ))}
           </tbody>
         </table>
       )}
     </main>
   )
 }
