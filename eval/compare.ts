// How we decide whether the model's answer matches the golden answer.
//
// Split out of run.ts so it's pure and testable — run.ts kicks off main() the moment
// it's imported, which makes it useless to a test file. Everything here is data in,
// data out: no database, no api key, no network.

export type Verdict = 'PASS' | 'FAIL' | 'EMPTY' | 'ERROR'

/**
 * Squash a single cell down to something comparable.
 *
 * The old harness just called String() on everything and demanded an exact match,
 * which threw away correct answers for silly reasons: postgres hands back "4" where
 * json has 4, and the same instant comes out as "2026-07-19 10:00:00+00" one way and
 * "2026-07-19T10:00:00.000Z" the other. Same data, different spelling, marked wrong.
 */
export function normVal(v: unknown): string {
  if (v === null || v === undefined) return '∅'
  if (typeof v === 'boolean') return v ? 'b:true' : 'b:false'

  const s = String(v).trim()
  if (s === '') return '∅'

  // 4, "4" and "4.00" all mean the same number
  if (!Number.isNaN(Number(s))) return `n:${Number(s)}`

  // only try date parsing on things that actually look like dates — left to its own
  // devices Date.parse cheerfully "understands" all kinds of nonsense
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const t = Date.parse(s)
    if (!Number.isNaN(t)) return `t:${new Date(t).toISOString()}`
  }

  return `s:${s}`
}

export function rowValues(row: unknown): string[] {
  if (row && typeof row === 'object') {
    return Object.values(row as Record<string, unknown>).map(normVal)
  }
  return [normVal(row)]
}

/**
 * Does `got` contain everything `want` has?
 *
 * Deliberately a subset check rather than equality. If the question was "which
 * components are flagged" and the model returns name + id while the golden answer is
 * just name, that still answers the question — so it shouldn't be marked wrong.
 * Column ORDER and column NAMES are ignored; only the values count.
 *
 * The flip side: golden answers must be MINIMAL. Extra columns in the model's answer
 * are forgiven, missing ones are not.
 */
export function rowCovers(got: unknown, want: unknown): boolean {
  const pool = rowValues(got)
  return rowValues(want).every((value) => {
    const at = pool.indexOf(value)
    if (at === -1) return false
    pool.splice(at, 1)   // consume it, so two wanted 5s need two actual 5s
    return true
  })
}

/** Row count has to match exactly — that part IS the answer, so we stay strict. */
export function matches(got: unknown[], want: unknown[]): boolean {
  if (got.length !== want.length) return false

  const pool = [...got]
  return want.every((wantRow) => {
    const at = pool.findIndex((gotRow) => rowCovers(gotRow, wantRow))
    if (at === -1) return false
    pool.splice(at, 1)
    return true
  })
}

/**
 * THE important bit.
 *
 * The old harness called sameRows([], []) and got back `true`. So every question whose
 * golden query returned nothing scored as a PASS — including all the ones that returned
 * nothing BECAUSE the database was broken. Accuracy looked best exactly where the
 * system was most broken, which is the worst possible failure mode for a test suite.
 *
 * An empty expected result can't tell a right answer from a wrong one. That's not a
 * pass, it's an unusable test case, and it now gets reported as one.
 */
export function judge(got: unknown[], want: unknown[]): Verdict {
  if (want.length === 0) return 'EMPTY'
  return matches(got, want) ? 'PASS' : 'FAIL'
}
