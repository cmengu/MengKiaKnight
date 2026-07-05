'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export type NavItem<T extends string = string> = {
  id: T
  label: string
  icon: LucideIcon
}

export function SideNav<T extends string>({
  brand,
  subtitle,
  items,
  activeId,
  onSelect,
  footer,
}: {
  brand: string
  subtitle?: string
  items: NavItem<T>[]
  activeId: T
  onSelect: (id: T) => void
  footer?: ReactNode
}) {
  return (
    <aside className="w-64 bg-surface-raised border-r border-border-subtle flex flex-col justify-between">
      <div>
        <div className="p-6 border-b border-border-subtle">
          <h1 className="text-xl font-bold text-fg tracking-wide">{brand}</h1>
          {subtitle && <span className="text-sm font-semibold tracking-wide text-brand-fg">{subtitle}</span>}
        </div>

        <nav className="px-3 space-y-1 mt-4">
          {items.map(({ id, label, icon: Icon }) => {
            const active = id === activeId
            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                aria-current={active ? 'page' : undefined}
                className={`relative w-full flex items-center gap-3 text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand
                  ${active
                    ? 'bg-brand/10 text-fg shadow-[0_0_18px_rgba(16,185,129,0.12)]'
                    : 'text-fg-secondary hover:bg-surface-hover hover:text-fg'}`}
              >
                {/* active indicator bar */}
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-brand shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                <Icon size={18} strokeWidth={2} className={active ? 'text-brand-fg' : ''} />
                {label}
              </button>
            )
          })}
        </nav>
      </div>

      {footer && (
        <div className="p-4 border-t border-border-subtle flex flex-col gap-2">
          {footer}
        </div>
      )}
    </aside>
  )
}
