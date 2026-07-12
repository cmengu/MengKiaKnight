import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="p-3 rounded-full bg-surface-overlay text-fg-muted mb-4">
        <Icon size={28} strokeWidth={1.5} />
      </div>
      <h3 className="text-fg font-semibold">{title}</h3>
      {description && <p className="text-fg-secondary text-sm mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
