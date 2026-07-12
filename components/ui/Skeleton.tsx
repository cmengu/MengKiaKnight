export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-overlay ${className}`} />
}

/** Placeholder rows for tables while data loads. */
export function SkeletonRows({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="p-4">
              <Skeleton className="h-4 w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
