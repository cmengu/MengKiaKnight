import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { generateSql, extractSql, validateSelect } from '../lib/ask'
import { judge, type Verdict } from './compare'

// Preflight. Without this the run dies inside the Supabase SDK with "supabaseUrl is
// required" and a stack trace pointing at node_modules — which says nothing about WHICH
// of the three required values is actually missing. Check all three up front and name them.
const REQUIRED_ENV = [
  'ANTHROPIC_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

const missing = REQUIRED_ENV.filter((k) => !process.env[k])
if (missing.length > 0) {
  const detail = `eval skipped — missing credentials: ${missing.join(', ')}`

  // In CI the credentials legitimately may not exist: a fork PR cannot read repository
  // secrets at all. Failing the whole pipeline for that would mean a contributor's PR
  // goes red for a reason they cannot fix. So we SKIP loudly instead — ::notice:: puts
  // the reason on the run summary, so a skipped eval can never be mistaken for a passed
  // one. This is the same graceful-degradation stance the floor map takes when its
  // optional migration is absent: degrade honestly and say so, never fail silently.
  if (process.env.CI) {
    console.log(`::notice title=Eval skipped::${detail}`)
    console.log(`\n${detail}`)
    console.log('The eval needs repository secrets. It runs on main and on manual dispatch.')
    process.exit(0)
  }

  // Locally, missing env is always a mistake worth stopping for.
  console.error(`\nCannot run the eval — missing env: ${missing.join(', ')}`)
  console.error('Locally:  npx tsx --env-file=.env.local eval/run.ts')
  console.error('In CI:    add these as *repository* secrets (Settings -> Secrets and')
  console.error('          variables -> Actions -> Secrets tab). Note that Variables and')
  console.error('          Environment secrets are NOT visible to a job as secrets.*\n')
  process.exit(1)
}

// service-role client so the script can call the RPC w/o a logged-in cookie session
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type Case = {
  id: string
  question: string
  expected_sql: string
  note?: string
}

type Result = {
  id: string
  question: string
  verdict: Verdict
  generated?: string
  error?: string
  gotRowCount?: number
  wantRowCount?: number
}

async function run(sql: string) {
  const { data, error } = await supabase.rpc('run_readonly_query', { query_text: sql })
  if (error) throw new Error(error.message)
  return data as unknown[]
}

async function main() {
  const cases: Case[] = JSON.parse(readFileSync('eval/golden_dataset.json', 'utf8'))
  const results: Result[] = []

  for (const c of cases) {
    try {
      const generated = validateSelect(extractSql(await generateSql(c.question)))
      const [got, want] = await Promise.all([run(generated), run(c.expected_sql)])
      const verdict = judge(got, want)

      results.push({
        id: c.id,
        question: c.question,
        verdict,
        generated,
        gotRowCount: got.length,
        wantRowCount: want.length,
      })

      console.log(`${verdict.padEnd(5)} ${c.id}`)
      if (verdict === 'FAIL') {
        console.log(`      generated: ${generated}`)
        console.log(`      rows got ${got.length}, expected ${want.length}`)
      }
      if (verdict === 'EMPTY') {
        console.log(`      golden query returned 0 rows — dis case proves nothing`)
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      results.push({ id: c.id, question: c.question, verdict: 'ERROR', error })
      console.log(`ERROR ${c.id}  (${error})`)
    }
  }

  const tally = (v: Verdict) => results.filter((r) => r.verdict === v).length
  const passed = tally('PASS')
  const empty = tally('EMPTY')
  // an EMPTY case can't be graded either way, so it comes OUT of the denominator
  // rather than quietly inflating the score like it used to
  const scorable = cases.length - empty
  const accuracy = scorable > 0 ? (passed / scorable) * 100 : 0

  console.log('\n' + '-'.repeat(50))
  console.log(`PASS   ${passed}`)
  console.log(`FAIL   ${tally('FAIL')}`)
  console.log(`ERROR  ${tally('ERROR')}`)
  console.log(`EMPTY  ${empty}   (excluded — golden query returned nothing)`)
  console.log(`\nAccuracy: ${passed}/${scorable} = ${accuracy.toFixed(1)}%`)

  if (empty > 0) {
    console.log(
      `\nWARNING: ${empty} case(s) had an empty expected result. Either seed data for` +
      `\nthem or rewrite the question — right now they measure nothing.`,
    )
  }

  // the CI workflow uploads dis as an artifact, so a failed run is still inspectable
  // without having to re-run the whole thing locally
  writeFileSync(
    'eval/report.json',
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total: cases.length,
        passed,
        failed: tally('FAIL'),
        errored: tally('ERROR'),
        empty,
        scorable,
        accuracy: Number(accuracy.toFixed(1)),
        results,
      },
      null,
      2,
    ),
  )
  console.log('\nWrote eval/report.json')

  if (passed < scorable) process.exitCode = 1   // non-zero exit so CI can gate on it
}

main()
