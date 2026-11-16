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
  'inline-flex min-h-[40px] items-center justify-center rounded-full border border-[#D7E0EC] bg-white px-4 text-[14px] font-semibold text-[#071330] hover:bg-white'

/**
 * Dark navy CTA surface matching the landing header Sign up family.
 * Color / hover / focus only. Pair with existing size, radius, and font classes.
 * Prefer the shared `.hc-btn-navy` class when the host already uses CSS sizing.
 */
export const navyButtonClass =
  'border border-[#071330] bg-[#071330] text-white transition-colors hover:border-[#142450] hover:bg-[#142450] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93C5FD]/70 focus-visible:ring-offset-2'

/**
 * Destructive outline for Cancel job (and matching owner cancel controls).
 * Prefer shared `.hc-btn-danger-outline` for color / hover (see globals.css).
 * Size / radius / width stay with the host (or `dangerOutlineButtonClass`).
 */
export const dangerOutlineColorClass =
  'hc-btn-danger-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2C4C4] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

/** Full Cancel job footprint used on the job page and Browse drawer. */
export const dangerOutlineButtonClass = `inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg px-[18px] text-[14px] font-semibold tracking-[-0.01em] ${dangerOutlineColorClass}`

/**
 * Solid destructive confirm (Cancel job dialog). Matches account danger CTAs at #C62828.
 * Prefer `.account-hc-btn-danger` in ConfirmDialog; this string is for Tailwind hosts.
 */
export const dangerSolidButtonClass =
  'border-0 bg-[#C62828] text-white transition-colors hover:bg-[#B71C1C] disabled:cursor-not-allowed disabled:opacity-60'

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
