import Link from 'next/link'
import type { ComponentProps, CSSProperties, ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

type Tone = 'base' | 'raised' | 'panel' | 'ink'

const toneClass: Record<Tone, string> = {
  base: 'bg-beam-base',
  raised: 'bg-beam-raised',
  panel: 'bg-beam-panel',
  ink: 'bg-beam-ink',
}

/** Tracked sans metadata / eyebrow. */
export function MetaLabel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p className={`flat-meta text-[11px] font-medium uppercase text-beam-amber ${className}`}>
      {children}
    </p>
  )
}

/** Borderless flat surface — hierarchy via tone + whitespace, not card chrome. */
export function FlatSurface({
  tone = 'raised',
  className = '',
  children,
  as: Tag = 'div',
}: {
  tone?: Tone
  className?: string
  children: ReactNode
  as?: 'div' | 'article' | 'section' | 'li'
}) {
  return <Tag className={`flat-surface ${toneClass[tone]} ${className}`}>{children}</Tag>
}

/**
 * Horizontal interactive row — hover tint + optional arrow, no elevation.
 * Keep focus rings; soft selected state via `active`.
 */
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
      className={`flat-row group touch-target flex items-center gap-3 rounded-xl px-3 py-3 transition ${
        active ? 'bg-beam-amber-soft text-beam-amber' : 'hover:bg-white/[0.04]'
      } ${className}`}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {arrow ? (
        <ArrowRight
          className="h-4 w-4 shrink-0 text-beam-muted transition group-hover:translate-x-0.5 group-hover:text-beam-amber"
          aria-hidden
        />
      ) : null}
    </Link>
  )
}

/** Asymmetric flat bento cell — soft edge highlight only, no shadow elevation. */
export function FlatBento({
  children,
  className = '',
  href,
}: {
  children: ReactNode
  className?: string
  href?: string
}) {
  const classes = `flat-bento relative overflow-hidden rounded-2xl ${className}`
  if (href) {
    return (
      <Link href={href} className={`${classes} flat-row group block transition hover:bg-white/[0.03]`}>
        {children}
      </Link>
    )
  }
  return <div className={classes}>{children}</div>
}

/**
 * Native sticky stack section for marketing surfaces.
 * Use `stick` only when content is viewport-safe (see docs/flat-ui.md).
 */
export function StackSection({
  id,
  children,
  className = '',
  stick = false,
  zIndex = 1,
  tone = 'base',
}: {
  id?: string
  children: ReactNode
  className?: string
  stick?: boolean
  zIndex?: number
  tone?: Tone
}) {
  const style = { ['--stack-z' as string]: zIndex } as CSSProperties
  return (
    <section
      id={id}
      style={style}
      className={`beam-stack-section ${toneClass[tone]} ${stick ? 'beam-stack-section--stick' : ''} ${className}`}
    >
      {children}
    </section>
  )
}

/** Segmented control — keeps a discernible boundary for selection (protected chrome). */
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
      className={`flex rounded-xl border border-beam-line/80 bg-beam-ink/80 p-1 ${className}`}
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
            className={`touch-target flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold capitalize transition ${
              selected ? 'bg-beam-amber text-beam-base' : 'text-beam-muted hover:text-beam-cream'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/** Filter chip — selected uses amber fill; idle keeps hairline for affordance. */
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
      className={`touch-target shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-beam-amber text-beam-base'
          : 'border border-beam-line/70 text-beam-cream-dim hover:border-beam-amber/40 hover:text-beam-cream'
      }`}
    >
      {label}
    </button>
  )
}

export function FlatDivider({ className = '' }: { className?: string }) {
  return <hr className={`border-0 border-t border-white/[0.06] ${className}`} />
}

export type FlatLinkProps = ComponentProps<typeof Link>
