import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

type Tone = 'base' | 'raised' | 'panel' | 'ink' | 'canvas'

const toneClass: Record<Tone, string> = {
  base: 'bg-white',
  raised: 'bg-white',
  panel: 'bg-beam-canvas',
  ink: 'bg-beam-canvas',
  canvas: 'bg-beam-canvas',
}

export function MetaLabel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <p className={`flat-meta text-beam-muted ${className}`}>{children}</p>
}

/** Raised white surface with elevation physics. */
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
      className={`${bordered ? 'elevated' : ''} ${toneClass[tone]} ${className}`}
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
        active ? 'bg-beam-amber-soft text-beam-amber-deep' : 'hover:bg-beam-surface-3'
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
  const classes = `elevated elevated-hover relative overflow-hidden ${className}`
  if (href) {
    return (
      <Link href={href} className={`${classes} flat-row group block`}>
        {children}
      </Link>
    )
  }
  return <div className={classes}>{children}</div>
}

export function LandingSection({
  id,
  children,
  className = '',
  tone = 'base',
  band = false,
}: {
  id?: string
  children: ReactNode
  className?: string
  tone?: Tone
  band?: boolean
}) {
  return (
    <section
      id={id}
      className={`section ${toneClass[tone]} ${band ? 'section-band' : ''} ${className}`}
    >
      {children}
    </section>
  )
}

/** Recessed track + floating white active pill. */
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
      className={`flex rounded-[12px] bg-[#eef0f4] p-1 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] ${className}`}
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
            className={`btn-compact flex-1 rounded-[9px] px-3 text-[13px] font-semibold capitalize transition ${
              selected
                ? 'bg-white text-beam-cream shadow-[0_1px_2px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.95)]'
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
      className={`btn-compact shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition ${
        active
          ? 'bg-beam-charcoal text-white shadow-[0_1px_2px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.12)]'
          : 'bg-white text-beam-cream-dim shadow-[0_0_0_1px_rgba(15,23,42,0.08)] hover:text-beam-cream'
      }`}
    >
      {label}
    </button>
  )
}

export function FlatDivider({ className = '' }: { className?: string }) {
  return <hr className={`border-0 border-t border-black/[0.06] ${className}`} />
}

export function AppWindow({
  url = 'yariapp.com',
  children,
  className = '',
  toolbar,
}: {
  url?: string
  children: ReactNode
  className?: string
  toolbar?: ReactNode
}) {
  return (
    <div className={`window-chrome ${className}`}>
      <div className="window-chrome-bar">
        <div className="traffic-lights" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <div className="window-url">{url}</div>
        {toolbar}
      </div>
      {children}
    </div>
  )
}

export type FlatLinkProps = ComponentProps<typeof Link>
