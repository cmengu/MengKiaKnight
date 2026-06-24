import Anthropic from '@anthropic-ai/sdk'

 // we instantiate once at module scope (reused across requests), reads ANTHROPIC_API_KEY from env
 const anthropic = new Anthropic()

 // da schema we let Claude see 
 export const SCHEMA_PROMPT = `
 You translate a factory manager's question into ONE PostgreSQL SELECT query.
 Tables (Postgres):
   workstations(id uuid, name text, location text, created_at timestamptz)
   components(id uuid, name text, current_status text /* pending|in_progress|completed|flagged */,
              current_workstation_id uuid, current_workstation_name text, updated_at timestamptz)
   status_logs(id uuid, component_id uuid, from_status text, to_status text,
               workstation_id uuid, updated_by uuid, timestamp timestamptz)
 Rules:
 - Return ONLY the SQL. No prose, no markdown fences, no semicolon.
 - It MUST be a single read-only SELECT (a leading WITH is allowed).
 - Always add a LIMIT 100 if the query could return many rows.
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

 /** we strip accidental ```sql fences / trailing semicolons the model may add cos dumb lol. */
 export function extractSql(text: string): string {
   let s = text.trim()
   const fence = s.match(/```(?:sql)?\s*([\s\S]*?)```/i)
   if (fence) s = fence[1].trim()
   return s.replace(/;+\s*$/, '').trim()
 }

 // these are the forbidden keywords that the model is not allowed to use
 const FORBIDDEN = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|merge|copy|call)\b/i

 /** gna throw if the SQL is not a single read-only SELECT */
 export function validateSelect(sql: string): string {
   const s = sql.trim()
   if (!/^(select|with)\b/i.test(s)) throw new Error('Only SELECT queries are allowed')
   if (s.includes(';')) throw new Error('Only a single statement is allowed')
   if (FORBIDDEN.test(s)) throw new Error('Query contains a forbidden keyword')
   return s
 }
