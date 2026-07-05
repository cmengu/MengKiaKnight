import type { LucideIcon } from 'lucide-react'
import { Card } from './Card'

type Tone = 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'info'

const valueTone: Record<Tone, string> = {
  default: 'text-fg',
  brand:   'text-brand-fg',
  success: 'text-success',
  warning: 'text-warning',
  danger:  'text-danger',
  info:    'text-info',
}

const iconTone: Record<Tone, string> = {
  default: 'bg-surface-overlay text-fg-secondary',
  brand:   'bg-brand/15 text-brand-fg',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger:  'bg-danger/15 text-danger',
  info:    'bg-info/15 text-info',
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  delta,
}: {
  label: string
  value: string | number
  icon?: LucideIcon
  tone?: Tone
  delta?: string
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-fg-secondary text-sm font-medium mb-2">{label}</p>
          <h3 className={`text-3xl font-bold ${valueTone[tone]}`}>{value}</h3>
          {delta && <p className="text-fg-muted text-xs mt-2">{delta}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${iconTone[tone]}`}>
            <Icon size={20} strokeWidth={2} />
          </div>
        )}
      </div>
    </Card>
  )
}
