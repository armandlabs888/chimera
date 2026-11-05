import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

type Tone = 'base' | 'raised' | 'panel' | 'ink'

const toneClass: Record<Tone, string> = {
  base: 'bg-beam-base',
  raised: 'bg-beam-raised',
  panel: 'bg-beam-panel',
  ink: 'bg-beam-ink',
}

/** Compact metadata / eyebrow. */
export function MetaLabel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <p className={`flat-meta text-beam-muted ${className}`}>{children}</p>
}

/** Light surface with subtle 1px border. */
export function FlatSurface({
  tone = 'raised',
  className = '',
  children,
  as: Tag = 'div',
  bordered = true,
}: {
  tone?: Tone
  className?: string
  children: ReactNode
  as?: 'div' | 'article' | 'section' | 'li'
  bordered?: boolean
}) {
  return (
    <Tag
      className={`rounded-[12px] ${toneClass[tone]} ${bordered ? 'border border-beam-line' : ''} ${className}`}
    >
      {children}
    </Tag>
  )
}

export function FlatRow({
  href,
  children,
  className = '',
  arrow = true,
  active = false,
}: {
  href: string
  children: ReactNode
  className?: string
  arrow?: boolean
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flat-row group flex min-h-11 items-center gap-3 rounded-[12px] px-3 py-2.5 transition ${
        active ? 'bg-beam-amber-soft text-beam-amber-deep' : 'hover:bg-beam-ink'
      } ${className}`}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {arrow ? (
        <ArrowRight
          className="h-4 w-4 shrink-0 text-beam-muted transition duration-150 group-hover:translate-x-0.5 group-hover:text-beam-amber"
          aria-hidden
        />
      ) : null}
    </Link>
  )
}

export function FlatBento({
  children,
  className = '',
  href,
}: {
  children: ReactNode
  className?: string
  href?: string
}) {
  const classes = `flat-bento relative overflow-hidden ${className}`
  if (href) {
    return (
      <Link href={href} className={`${classes} flat-row group block transition hover:bg-beam-ink`}>
        {children}
      </Link>
    )
  }
  return <div className={classes}>{children}</div>
}

/** Marketing page section — normal document flow (no sticky stacking). */
export function LandingSection({
  id,
  children,
  className = '',
  tone = 'base',
  fullPage = false,
}: {
  id?: string
  children: ReactNode
  className?: string
  tone?: Tone
  /** Full viewport min-height under sticky nav; grows with content (never clips). */
  fullPage?: boolean
}) {
  return (
    <section
      id={id}
      className={`${toneClass[tone]} ${fullPage ? 'landing-section-full' : ''} ${className}`}
    >
      {fullPage ? <div className="landing-section-full-inner w-full">{children}</div> : children}
    </section>
  )
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className = '',
}: {
  options: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
  className?: string
}) {
  return (
    <div
      className={`flex rounded-[10px] border border-beam-line bg-beam-ink p-0.5 ${className}`}
      role="tablist"
    >
      {options.map((opt) => {
        const selected = opt.id === value
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.id)}
            className={`btn-compact flex-1 rounded-[8px] px-3 text-[13px] font-medium capitalize transition ${
              selected
                ? 'bg-beam-base text-beam-cream shadow-sm'
                : 'text-beam-muted hover:text-beam-cream'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn-compact shrink-0 rounded-full px-3.5 text-[13px] font-medium transition ${
        active
          ? 'bg-beam-charcoal text-white'
          : 'border border-beam-line text-beam-cream-dim hover:border-beam-cream/40 hover:text-beam-cream'
      }`}
    >
      {label}
    </button>
  )
}

export function FlatDivider({ className = '' }: { className?: string }) {
  return <hr className={`border-0 border-t border-beam-line ${className}`} />
}

export type FlatLinkProps = ComponentProps<typeof Link>
