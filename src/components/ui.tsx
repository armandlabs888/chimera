import Link from 'next/link'
import type {
  ButtonHTMLAttributes,
  ComponentProps,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}) {
  const styles = {
    primary:
      'bg-beam-amber text-beam-base hover:bg-beam-amber-deep disabled:opacity-40',
    secondary:
      'bg-beam-panel text-beam-cream border border-beam-line hover:border-beam-amber/50 disabled:opacity-40',
    ghost: 'bg-transparent text-beam-cream hover:bg-white/5 disabled:opacity-40',
    danger: 'bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25',
  }[variant]

  return (
    <button
      className={`touch-target inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${styles} ${className}`}
      {...props}
    />
  )
}

export function ButtonLink({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  const styles = {
    primary: 'bg-beam-amber text-beam-base hover:bg-beam-amber-deep',
    secondary:
      'bg-beam-panel text-beam-cream border border-beam-line hover:border-beam-amber/50',
    ghost: 'bg-transparent text-beam-cream hover:bg-white/5',
  }[variant]

  return (
    <Link
      className={`touch-target inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${styles} ${className}`}
      {...props}
    />
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-beam-cream-dim">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-beam-muted">{hint}</span> : null}
    </label>
  )
}

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`touch-target w-full rounded-xl border border-beam-line bg-beam-raised px-4 py-3 text-beam-cream placeholder:text-beam-muted focus:border-beam-amber ${className}`}
      {...props}
    />
  )
}

export function TextArea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-28 w-full rounded-xl border border-beam-line bg-beam-raised px-4 py-3 text-beam-cream placeholder:text-beam-muted focus:border-beam-amber ${className}`}
      {...props}
    />
  )
}

export function SectionHeader({
  title,
  action,
  subtitle,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-beam-cream">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-beam-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-beam-line bg-beam-raised/60 px-5 py-10 text-center">
      <h3 className="font-display text-xl text-beam-cream">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-beam-muted">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'amber' | 'live' }) {
  const toneClass =
    tone === 'amber'
      ? 'bg-beam-amber-soft text-beam-amber'
      : tone === 'live'
        ? 'bg-emerald-500/15 text-emerald-300'
        : 'bg-white/5 text-beam-cream-dim'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${toneClass}`}>
      {children}
    </span>
  )
}

export function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.round(rating)
  return (
    <span className="inline-flex items-center gap-0.5 text-beam-amber" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i < full ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path d="M12 3.5l2.7 5.5 6 .9-4.4 4.3 1 6-5.3-2.8L6.7 20.2l1-6L3.3 9.9l6-.9L12 3.5z" />
        </svg>
      ))}
    </span>
  )
}
