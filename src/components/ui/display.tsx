import type { ReactNode } from 'react'

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
        <h1 className="type-h2 text-beam-cream">{title}</h1>
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
    <div className="rounded-[12px] border border-dashed border-beam-line bg-beam-surface-2/60 px-4 py-12 text-center">
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
  tone?: 'neutral' | 'amber' | 'brand' | 'live' | 'success' | 'warning' | 'danger' | 'outline'
}) {
  const toneClass =
    tone === 'amber' || tone === 'brand'
      ? 'bg-beam-amber-soft text-beam-amber-deep'
      : tone === 'live' || tone === 'success'
        ? 'bg-beam-success-soft text-beam-success'
        : tone === 'warning'
          ? 'bg-beam-warning-soft text-beam-warning'
          : tone === 'danger'
            ? 'bg-beam-danger-soft text-beam-danger'
            : tone === 'outline'
              ? 'border border-beam-line bg-beam-base text-beam-cream-dim'
              : 'bg-beam-surface-2 text-beam-cream-dim'
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

export function Card({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'article' | 'section'
}) {
  return (
    <Tag className={`rounded-[12px] border border-beam-line bg-beam-base ${className}`}>{children}</Tag>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton-block ${className}`} aria-hidden />
}

export function InlineBanner({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'success' | 'warning' | 'error'
  children: ReactNode
}) {
  const styles =
    tone === 'error'
      ? 'border-red-200 bg-beam-danger-soft text-beam-danger'
      : tone === 'success'
        ? 'border-emerald-200 bg-beam-success-soft text-beam-success'
        : tone === 'warning'
          ? 'border-amber-200 bg-beam-warning-soft text-beam-warning'
          : 'border-beam-line bg-beam-surface-2 text-beam-cream-dim'
  return (
    <div className={`rounded-[10px] border px-3.5 py-2.5 type-sec ${styles}`} role="status" aria-live="polite">
      {children}
    </div>
  )
}

export function Avatar({
  src,
  name,
  size = 36,
}: {
  src?: string
  name: string
  size?: number
}) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className="rounded-[8px] object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-[8px] bg-beam-surface-2 type-meta font-semibold text-beam-cream-dim"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials}
    </span>
  )
}

export function Money({ amount, className = '' }: { amount: number | string; className?: string }) {
  const text = typeof amount === 'number' ? `$${amount}` : amount
  return <span className={`tabular-nums font-semibold ${className}`}>{text}</span>
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'open'
      ? 'live'
      : status === 'accepted' || status === 'completed'
        ? 'success'
        : status === 'cancelled'
          ? 'danger'
          : 'neutral'
  return <Badge tone={tone as 'live'}>{status}</Badge>
}
