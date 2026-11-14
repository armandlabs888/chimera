import Link from 'next/link'
import type { ButtonHTMLAttributes, ComponentProps } from 'react'

export type ButtonVariant = 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[#1D5CE5] text-white shadow-none hover:bg-[#1649BD] active:scale-[0.98] disabled:opacity-40',
  brand:
    'bg-[#1D5CE5] text-white shadow-none hover:bg-[#1649BD] active:scale-[0.98] disabled:opacity-40',
  secondary:
    'bg-[#EEF2F7] text-[#071330] border-0 hover:bg-[#E3E8EF] disabled:opacity-40',
  ghost:
    'bg-transparent text-[#4A5568] hover:bg-[#EEF2F7] hover:text-[#071330] disabled:opacity-40',
  danger:
    'bg-beam-danger-soft text-beam-danger border border-red-500/25 hover:bg-red-500/15 disabled:opacity-40',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'inline-flex min-h-[44px] items-center rounded-lg px-3.5 py-2 text-[13px] font-semibold',
  md: 'touch-target rounded-lg px-5 py-2 text-[15px] font-semibold',
  lg: 'touch-target rounded-lg px-[26px] py-2.5 text-[15px] font-semibold',
}

/** Secondary / tertiary actions that should read as Yelp-style flat pills. */
export const secondaryPillClass =
  'inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#EEF2F7] px-5 text-[14px] font-semibold text-[#071330] hover:bg-[#E3E8EF]'
export const outlinePillClass =
  'inline-flex min-h-[40px] items-center justify-center rounded-full border border-[#D7E0EC] bg-white px-4 text-[14px] font-semibold text-[#071330] hover:bg-[#F5F9FF]'

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
