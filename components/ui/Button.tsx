import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary:   'bg-brand hover:bg-brand-hover text-white shadow-[0_0_16px_rgba(16,185,129,0.25)] hover:shadow-[0_0_22px_rgba(16,185,129,0.4)]',
  secondary: 'bg-surface-overlay hover:bg-surface-hover text-fg border border-border-strong',
  ghost:     'text-fg-secondary hover:bg-surface-hover hover:text-fg',
  danger:    'text-fg-secondary hover:bg-danger/10 hover:text-danger',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand
        disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
