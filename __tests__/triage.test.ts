// __tests__/triage.test.ts

import { getUrgency } from "@/utils/triage"

describe('Component Triage Logic', () => {
  
  it('should mark completed components as safe regardless of deadline', () => {
    const oldDeadline = new Date(Date.now() - 100000000000).toISOString()
    expect(getUrgency(oldDeadline, 'completed')).toBe('safe')
  })

  it('should mark items with no deadline as safe', () => {
    expect(getUrgency(null, 'in_progress')).toBe('safe')
  })

  it('should flag an item as overdue if the deadline has passed', () => {
    // 2 hours ago
    const pastDeadline = new Date(Date.now() - (2 * 60 * 60 * 1000)).toISOString()
    expect(getUrgency(pastDeadline, 'in_progress')).toBe('overdue')
  })

  it('should flag an item as due-soon if deadline is within 48 hours', () => {
    // 12 hours from now
    const soonDeadline = new Date(Date.now() + (12 * 60 * 60 * 1000)).toISOString()
    expect(getUrgency(soonDeadline, 'in_progress')).toBe('due-soon')
  })
})