 import { readFileSync } from 'fs'
 import { createClient } from '@supabase/supabase-js'
 import { generateSql, extractSql, validateSelect } from '../lib/ask'

 // service-role client so the script can call the RPC w/o a logged-in cookie session
 const supabase = createClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.SUPABASE_SERVICE_ROLE_KEY!,
 )

 async function run(sql: string) {
   const { data, error } = await supabase.rpc('run_readonly_query', { query_text: sql })
   if (error) throw new Error(error.message)
   return data as unknown[]
 }

 // to do value based, order- and column-name-insensitive comparison
 // Each row has its values as strings, sorted to compare, so {count:4} and {total:4} both become ["4"].
 function rowKey(row: unknown): string {
   if (row && typeof row === 'object') {
     return JSON.stringify(Object.values(row as Record<string, unknown>).map(String).sort())
   }
   return JSON.stringify(row)
 }
 function sameRows(a: unknown[], b: unknown[]): boolean {
   const norm = (xs: unknown[]) => xs.map(rowKey).sort()
   const A = norm(a), B = norm(b)
   return A.length === B.length && A.every((v, i) => v === B[i])
 }

 async function main() {
   const cases: { id: string; question: string; expected_sql: string }[] =
     JSON.parse(readFileSync('eval/golden_dataset.json', 'utf8'))

   let passed = 0
   for (const c of cases) {
     try {
       const generated = validateSelect(extractSql(await generateSql(c.question)))
       const [got, want] = await Promise.all([run(generated), run(c.expected_sql)])
       const ok = sameRows(got, want)
       if (ok) passed++
       console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.id}`)
       if (!ok) console.log(`   generated: ${generated}`)
     } catch (e) {
       console.log(`FAIL  ${c.id}  (${e instanceof Error ? e.message : e})`)
     }
   }
   console.log(`\nAccuracy: ${passed}/${cases.length} = ${((passed / cases.length) * 100).toFixed(0)}%`)
   if (passed < cases.length) process.exitCode = 1   // non-zero exit so CI can gate on it
 }
 main()