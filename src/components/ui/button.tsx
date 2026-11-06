import Link from 'next/link'
import type { ButtonHTMLAttributes, ComponentProps } from 'react'

export type ButtonVariant = 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-b from-[#D5A455] via-[#C6944B] to-[#B88842] text-[#FDFBF7] shadow-[0_8px_20px_rgba(198,148,75,0.22),inset_0_1px_0_rgba(255,235,195,0.3)] hover:brightness-105 active:translate-y-px disabled:opacity-40',
  brand:
    'bg-gradient-to-b from-[#D5A455] via-[#C6944B] to-[#B88842] text-[#FDFBF7] shadow-[0_8px_20px_rgba(198,148,75,0.22),inset_0_1px_0_rgba(255,235,195,0.3)] hover:brightness-105 active:translate-y-px disabled:opacity-40',
  secondary:
    'bg-[#131416]/90 text-[#ECE8E1] border border-white/[0.15] hover:bg-white/[0.06] hover:border-white/[0.24] disabled:opacity-40',
  ghost:
    'bg-transparent text-[#A7A39C] hover:bg-white/[0.06] hover:text-[#F7F4EE] disabled:opacity-40',
  danger:
    'bg-beam-danger-soft text-beam-danger border border-red-500/30 hover:bg-red-500/20 disabled:opacity-40',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'btn-compact rounded-[10px] px-3.5 py-1.5 text-[13px] font-medium',
  md: 'touch-target rounded-[11px] px-4 py-2 text-[14px] font-medium',
  lg: 'touch-target rounded-[12px] px-5 py-2.5 text-[15px] font-medium',
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
