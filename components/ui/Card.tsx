import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface-raised border border-border-subtle rounded-xl shadow-card ${className}`}>
      {children}
    </div>
  )
}
