import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-surface-raised bg-gradient-to-b from-white/[0.045] to-transparent
        border border-border-subtle rounded-xl shadow-card
        hover:border-border-strong transition-colors duration-200 ${className}`}
    >
      {children}
    </div>
  )
}
