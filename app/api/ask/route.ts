import { getServerSupabase } from '@/lib/supabaseServer'
 import { generateSql, extractSql, validateSelect } from '@/lib/ask'

 export async function POST(request: Request) {
   try {
     const { question } = await request.json()
     if (!question || typeof question !== 'string') {
       return Response.json({ error: 'Missing question' }, { status: 400 })
     }

     // ensure its authenticated managers only
     const supabase = await getServerSupabase()
     const { data: { user } } = await supabase.auth.getUser()
     if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

     // 2) rmb validate throws on anything thats not a single SELECT
     const raw = await generateSql(question)
     const sql = validateSelect(extractSql(raw))

     // 3) then execute read-only via the RPC
     const { data, error } = await supabase.rpc('run_readonly_query', { query_text: sql })
     if (error) return Response.json({ sql, error: error.message }, { status: 400 })

     return Response.json({ sql, rows: data })
   } catch (err) {
     const message = err instanceof Error ? err.message : 'Unknown error'
     return Response.json({ error: message }, { status: 400 })
   }
 }
