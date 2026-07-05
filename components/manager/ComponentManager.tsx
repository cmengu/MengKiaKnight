'use client'

export function ComponentManager() {
  return (
    <div className="bg-surface-raised bg-gradient-to-b from-white/[0.045] to-transparent p-8 rounded-xl border border-border-subtle shadow-card hover:border-border-strong transition-colors duration-200 w-full">
      <h2 className="text-xl text-fg font-bold mb-4">Component Management</h2>
      <p className="text-fg-secondary">
        Table for modifying names, assigning deadlines, and viewing history will go here.
      </p>
    </div>
  )
}
