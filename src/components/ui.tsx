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
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}) {
  const styles = {
    primary:
      'bg-beam-amber text-beam-charcoal hover:bg-beam-amber-deep disabled:opacity-40',
    secondary:
      'bg-beam-base text-beam-cream border border-beam-line hover:border-beam-amber/60 disabled:opacity-40',
    ghost: 'bg-transparent text-beam-cream-dim hover:bg-beam-ink hover:text-beam-cream disabled:opacity-40',
    danger: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
  }[variant]

  const sizes = {
    sm: 'btn-compact rounded-[8px] px-3.5 py-1.5 text-[13px] font-medium',
    md: 'touch-target rounded-[10px] px-4 py-2 text-[15px] font-medium',
    lg: 'touch-target rounded-[12px] px-5 py-2.5 text-[15px] font-semibold',
  }[size]

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 transition ${sizes} ${styles} ${className}`}
      {...props}
    />
  )
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ComponentProps<typeof Link> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}) {
  const styles = {
    primary: 'bg-beam-amber text-beam-charcoal hover:bg-beam-amber-deep',
    secondary: 'bg-beam-base text-beam-cream border border-beam-line hover:border-beam-amber/60',
    ghost: 'bg-transparent text-beam-cream-dim hover:bg-beam-ink hover:text-beam-cream',
  }[variant]

  const sizes = {
    sm: 'btn-compact rounded-[8px] px-3.5 py-1.5 text-[13px] font-medium',
    md: 'touch-target rounded-[10px] px-4 py-2 text-[15px] font-medium',
    lg: 'touch-target rounded-[12px] px-5 py-2.5 text-[15px] font-semibold',
  }[size]

  return (
    <Link
      className={`inline-flex items-center justify-center gap-2 transition ${sizes} ${styles} ${className}`}
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
    <label className="block space-y-1.5">
      <span className="type-meta text-beam-muted">{label}</span>
      {children}
      {hint ? <span className="block type-sec text-beam-muted">{hint}</span> : null}
    </label>
  )
}

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`touch-target w-full rounded-[10px] border border-beam-line bg-beam-base px-3.5 py-2 text-[15px] text-beam-cream placeholder:text-beam-muted focus:border-beam-amber focus:outline-none ${className}`}
      {...props}
    />
  )
}

export function TextArea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-24 w-full rounded-[10px] border border-beam-line bg-beam-base px-3.5 py-2.5 text-[15px] text-beam-cream placeholder:text-beam-muted focus:border-beam-amber focus:outline-none ${className}`}
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
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h2 className="type-h2 text-beam-cream">{title}</h2>
        {subtitle ? <p className="mt-1 type-sec text-beam-muted">{subtitle}</p> : null}
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
    <div className="px-2 py-10 text-center">
      <h3 className="type-h3 text-beam-cream">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm type-sec text-beam-muted">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'amber' | 'live'
}) {
  const toneClass =
    tone === 'amber'
      ? 'bg-beam-amber-soft text-beam-amber-deep'
      : tone === 'live'
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-beam-ink text-beam-cream-dim'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 type-meta ${toneClass}`}>
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
