// The SQL guard rails. Pure string work — no Anthropic SDK, no network, no env vars.
//
// Split out of lib/ask.ts because importing that file drags in the whole Anthropic
// client just to reach these two functions, which makes them a pain to test and
// pointless to load in places that only need to sanity-check a query.

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
