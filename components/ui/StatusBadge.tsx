const STATUS_STYLES: Record<string, { classes: string; label: string }> = {
  pending:     { classes: 'bg-warning/15 text-warning', label: 'Pending' },
  in_progress: { classes: 'bg-info/15 text-info',       label: 'In Progress' },
  completed:   { classes: 'bg-success/15 text-success', label: 'Completed' },
  flagged:     { classes: 'bg-danger/15 text-danger',   label: 'Flagged' },
}

const UNKNOWN = { classes: 'bg-surface-overlay text-fg-secondary', label: 'Unknown' }

export function StatusBadge({ status }: { status: string | null }) {
  const { classes, label } = (status && STATUS_STYLES[status]) || UNKNOWN
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${classes}`}>
      {/* dot carries the state alongside color, for color-blind users */}
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}
