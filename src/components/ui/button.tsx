import Link from 'next/link'
import type { ButtonHTMLAttributes, ComponentProps } from 'react'

export type ButtonVariant = 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-beam-charcoal text-white hover:bg-black disabled:opacity-40',
  brand:
    'bg-beam-amber text-beam-charcoal hover:bg-beam-amber-deep disabled:opacity-40',
  secondary:
    'bg-beam-base text-beam-cream border border-beam-line hover:border-beam-line-strong hover:bg-beam-surface-2 disabled:opacity-40',
  ghost:
    'bg-transparent text-beam-cream-dim hover:bg-beam-surface-2 hover:text-beam-cream disabled:opacity-40',
  danger:
    'bg-beam-danger-soft text-beam-danger border border-red-200 hover:bg-red-100 disabled:opacity-40',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'btn-compact rounded-[8px] px-3.5 py-1.5 text-[13px] font-medium',
  md: 'touch-target rounded-[10px] px-4 py-2 text-[15px] font-medium',
  lg: 'touch-target rounded-[12px] px-5 py-2.5 text-[15px] font-semibold',
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V2C5.373 2 2 5.373 2 12h2z"
      />
    </svg>
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 transition ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  )
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ComponentProps<typeof Link> & {
  variant?: Exclude<ButtonVariant, 'danger'>
  size?: ButtonSize
}) {
  return (
    <Link
      className={`inline-flex items-center justify-center gap-2 transition ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    />
  )
}
