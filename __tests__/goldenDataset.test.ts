// __tests__/goldenDataset.test.ts
//
// Static checks on the golden dataset itself. Runs in CI with no api key and no
// database, so a typo'd question or a broken expected_sql gets caught on the PR
// instead of halfway through a paid eval run.

import { readFileSync } from 'fs'
// straight from lib/sql, not lib/ask — importing ask pulls in the whole Anthropic
// client, which needs an api key and node globals jsdom doesn't have
import { validateSelect, extractSql } from '@/lib/sql'

type Case = { id: string; question: string; expected_sql: string; note?: string }

const cases: Case[] = JSON.parse(readFileSync('eval/golden_dataset.json', 'utf8'))

describe('golden dataset — shape', () => {

  it('has at least 60 cases', () => {
    expect(cases.length).toBeGreaterThanOrEqual(60)
  })

  it('gives every case a unique id', () => {
    const ids = cases.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses tidy kebab-case ids', () => {
    for (const c of cases) {
      expect(c.id).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('gives every case a real question', () => {
    for (const c of cases) {
      expect(c.question.trim().length).toBeGreaterThan(5)
      // a question the manager would actually type
      expect(c.question).toMatch(/[?.]$/)
    }
  })
})

describe('golden dataset — every expected_sql is safe and valid', () => {

  it('survives the same validator the model output goes through', () => {
    for (const c of cases) {
      // if our own golden answer wouldn't be allowed, the case is unfair
      expect(() => validateSelect(extractSql(c.expected_sql))).not.toThrow()
    }
  })

  it('contains no semicolons', () => {
    for (const c of cases) {
      expect(c.expected_sql).not.toContain(';')
    }
  })

  it('starts every query with select or with', () => {
    for (const c of cases) {
      expect(c.expected_sql.trim().toLowerCase()).toMatch(/^(select|with)\b/)
    }
  })

  it('only references tables that actually exist', () => {
    const known = ['components', 'workstations', 'status_logs']
    for (const c of cases) {
      const tables = [...c.expected_sql.matchAll(/\b(?:from|join)\s+([a-z_]+)/gi)]
        .map((m) => m[1].toLowerCase())
        // subqueries alias themselves, those aren't tables
        .filter((t) => !['select'].includes(t))

      for (const t of tables) {
        expect(known).toContain(t)
      }
    }
  })
})

describe('golden dataset — questions the manager would actually ask', () => {

  it('covers all four component statuses somewhere', () => {
    const all = cases.map((c) => c.expected_sql).join(' ')
    for (const status of ['pending', 'in_progress', 'completed', 'flagged']) {
      expect(all).toContain(status)
    }
  })

  it('exercises the workstation flags the scanner now depends on', () => {
    const all = cases.map((c) => c.expected_sql).join(' ')
    expect(all).toContain('is_final_station')
    expect(all).toContain('is_qa')
    expect(all).toContain('is_active')
  })

  it('exercises the workstation_id join that used to return nothing', () => {
    // dis column was never written by the scanner, so every join on it came back
    // empty. worth making sure the dataset actually covers it.
    const joins = cases.filter((c) => c.expected_sql.includes('s.workstation_id'))
    expect(joins.length).toBeGreaterThanOrEqual(3)
  })

  it('asks about deadlines, not just statuses', () => {
    const deadline = cases.filter((c) => c.expected_sql.includes('deadline'))
    expect(deadline.length).toBeGreaterThanOrEqual(5)
  })

  it('includes superlatives, which need exactly one row back', () => {
    const limitOne = cases.filter((c) => /limit 1\b/i.test(c.expected_sql))
    expect(limitOne.length).toBeGreaterThanOrEqual(5)
  })
})
