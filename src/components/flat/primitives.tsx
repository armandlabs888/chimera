import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

type Tone = 'base' | 'raised' | 'panel' | 'ink' | 'canvas'

const toneClass: Record<Tone, string> = {
  base: 'bg-[#0E0F12]',
  raised: 'bg-[#16181D]',
  panel: 'bg-[#1D2026]',
  ink: 'bg-[#0E0F12]',
  canvas: 'bg-[#0E0F12]',
}

export function MetaLabel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <p className={`flat-meta ${className}`}>{children}</p>
}

/** Elevated dark surface. */
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
    <Tag className={`${bordered ? 'elevated' : ''} ${toneClass[tone]} ${className}`}>
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
        active
          ? 'bg-[rgba(221,163,82,0.14)] text-[#E7B567]'
          : 'hover:bg-white/[0.04] text-[#F7F4EE]'
      } ${className}`}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {arrow ? (
        <ArrowRight
          className="h-4 w-4 shrink-0 text-[#7E7A73] transition duration-150 group-hover:translate-x-0.5 group-hover:text-[#DDA352]"
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
}: {
  id?: string
  children: ReactNode
  className?: string
  /** @deprecated unused — kept for call-site compatibility */
  tone?: Tone
  /** @deprecated unused — kept for call-site compatibility */
  band?: boolean
}) {
  return (
    <section id={id} className={`section ${className}`}>
      {children}
    </section>
  )
}

/** Dark track + amber-selected pill. */
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
      className={`flex rounded-[12px] border border-white/[0.1] bg-[#121317] p-1 ${className}`}
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
                ? 'bg-[#1D2026] text-[#FAF8F4] shadow-[inset_0_0_0_1px_rgba(221,163,82,0.35)]'
                : 'text-[#A7A39C] hover:text-[#F7F4EE]'
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
      className={`btn-compact h-9 shrink-0 rounded-full px-3.5 text-[13px] font-medium transition ${
        active
          ? 'bg-[#F6F3EE] text-[#0C0C0E]'
          : 'bg-transparent text-[#B7B2AA] ring-1 ring-white/[0.14] hover:text-[#F6F3EE]'
      }`}
    >
      {label}
    </button>
  )
}

export function FlatDivider({ className = '' }: { className?: string }) {
  return <hr className={`border-0 border-t border-white/[0.08] ${className}`} />
}

/** Soft elevated preview frame — no macOS traffic lights. */
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
    <div className={`elevated overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#121317] px-3.5 py-2.5">
        <p className="truncate type-meta text-[#7E7A73]">{url}</p>
        {toolbar}
      </div>
      {children}
    </div>
  )
}

export type FlatLinkProps = ComponentProps<typeof Link>
