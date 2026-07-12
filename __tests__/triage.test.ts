// __tests__/triage.test.ts

const getRowStyle = (deadline: string | null, status: string) => {
  if (status === 'completed') return 'safe'
  if (!deadline) return 'safe'

  const now = new Date()
  const due = new Date(deadline)
  const hoursRemaining = (due.getTime() - now.getTime()) / (1000 * 60 * 60)

  // This log will print to your terminal so you can see the exact math it did!
  console.log(`Hours remaining: ${hoursRemaining}`)

  if (hoursRemaining < 0) return 'overdue'
  if (hoursRemaining < 24) return 'due-soon'
  
  return 'safe'
}

describe('Component Triage Logic', () => {
  
  it('should mark completed components as safe regardless of deadline', () => {
    const oldDeadline = new Date(Date.now() - 100000000000).toISOString()
    expect(getRowStyle(oldDeadline, 'completed')).toBe('safe')
  })

  it('should mark items with no deadline as safe', () => {
    expect(getRowStyle(null, 'in_progress')).toBe('safe')
  })

  it('should flag an item as overdue if the deadline has passed', () => {
    // 2 hours ago
    const pastDeadline = new Date(Date.now() - (2 * 60 * 60 * 1000)).toISOString()
    expect(getRowStyle(pastDeadline, 'in_progress')).toBe('overdue')
  })

  it('should flag an item as due-soon if deadline is within 24 hours', () => {
    // 12 hours from now
    const soonDeadline = new Date(Date.now() + (12 * 60 * 60 * 1000)).toISOString()
    expect(getRowStyle(soonDeadline, 'in_progress')).toBe('due-soon')
  })
})