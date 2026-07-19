import Anthropic from '@anthropic-ai/sdk'

 // we instantiate once at module scope (reused across requests), reads ANTHROPIC_API_KEY from env
 const anthropic = new Anthropic()

 // da schema we let Claude see 
 export const SCHEMA_PROMPT = `
 You translate a factory manager's question into ONE PostgreSQL SELECT query.

 Tables (Postgres):
   workstations(id uuid, name text, location text,
                is_qa boolean, is_final_station boolean, is_active boolean,
                created_at timestamptz)

   components(id uuid, name text,
              current_status text /* pending|in_progress|completed|flagged */,
              current_workstation_id uuid, current_workstation_name text,
              last_updated_by text /* worker's display name */,
              deadline timestamptz, created_at timestamptz, updated_at timestamptz)

   status_logs(id uuid, component_id uuid, component_name text,
               from_status text, to_status text,
               workstation_id uuid, workstation_name text,
               updated_by uuid /* worker's user id */, worker_name text,
               timestamp timestamptz)

 How the factory works:
 - components holds the CURRENT state of each part. status_logs is the append-only
   history of every scan. Use components for "right now" questions and status_logs
   for "what happened / when / who" questions.
 - A component moves: pending -> in_progress -> (back to pending at the next station)
   and finally -> completed. Only a workstation with is_final_station = true can mark
   something completed, so "completed" means it finished the WHOLE line, not one station.
 - flagged means a defect was found. It goes back to in_progress when reworked.
 - Join status_logs to workstations on status_logs.workstation_id = workstations.id.

 Output rules (IMPORTANT - these decide whether your answer is judged correct):
 - Return ONLY the SQL. No prose, no markdown fences, no semicolon.
 - It MUST be a single read-only SELECT (a leading WITH is allowed).
 - Select ONLY the columns the question actually asks for. Do not add helpful extra
   columns - an answer with extra columns is judged wrong.
 - "How many / count of X" -> return a single row with a single count column.
 - "Which / list / name the X" -> return the name column only, unless the question
   explicitly asks for more.
 - "How many X per/by Y" -> return exactly two columns: the grouping value, then the count.
 - Superlatives ("the most", "the latest", "the oldest", "which one") -> return exactly
   ONE row. Use ORDER BY ... LIMIT 1.
 - "Top N" -> ORDER BY the relevant column and LIMIT N.
 - Time windows: "today" means timestamp >= CURRENT_DATE. "This week" / "last 7 days"
   means timestamp >= NOW() - INTERVAL '7 days'.
 - "Overdue" means deadline < NOW() and current_status <> 'completed'.
 - Compare status values in lower case exactly as listed above.
 - Add LIMIT 100 to any query that could otherwise return many rows.
 `.trim()

 /** ask Claude for SQL and returns the raw model text (still needs extract+validate) */
 export async function generateSql(question: string): Promise<string> {
   const msg = await anthropic.messages.create({
     model: 'claude-opus-4-8',
     max_tokens: 1024,                 // one select sql query dont need so many tokens lol
     system: SCHEMA_PROMPT,
     messages: [{ role: 'user', content: question }],
   })
   const block = msg.content.find((b) => b.type === 'text')
   return block && block.type === 'text' ? block.text : ''
 }

 // these live in lib/sql.ts now (pure, no sdk) — re-exported here so every existing
 // `from '@/lib/ask'` import keeps working exactly as before
 export { extractSql, validateSelect } from '@/lib/sql'
