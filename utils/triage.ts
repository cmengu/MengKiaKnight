// utils/triage.ts

export type UrgencyStatus = 'safe' | 'due-soon' | 'overdue';

// Pure Business Logic (This is what we test)
export const getUrgency = (deadline: string | null, status: string): UrgencyStatus => {
  if (status === 'completed') return 'safe'
  if (!deadline) return 'safe'

  const now = new Date()
  const due = new Date(deadline)
  const hoursRemaining = (due.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursRemaining < 0) return 'overdue'
  if (hoursRemaining < 48) return 'due-soon'
  
  return 'safe'
}

// Presentation Logic (Maps status to Tailwind classes)
export const getUrgencyClasses = (urgency: UrgencyStatus): string => {
  switch (urgency) {
    case 'overdue': 
      return 'bg-red-900/20 hover:bg-red-900/30 border-l-4 border-red-500'
    case 'due-soon': 
      return 'bg-amber-900/20 hover:bg-amber-900/30 border-l-4 border-amber-500'
    case 'safe':
    default: 
      return 'hover:bg-slate-750 border-l-4 border-transparent'
  }
}