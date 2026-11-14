import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

type Tone = 'base' | 'raised' | 'panel' | 'ink' | 'canvas'

const toneClass: Record<Tone, string> = {
  base: 'bg-white',
  raised: 'bg-white',
  panel: 'bg-[#F4F8FD]',
  ink: 'bg-white',
  canvas: 'bg-[#F4F8FD]',
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
      className={`flat-row group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 transition ${
        active
          ? 'bg-[rgba(29,92,229,0.1)] text-[#1D5CE5]'
          : 'text-[#071330] hover:bg-[#F4F8FD]'
      } ${className}`}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {arrow ? (
        <ArrowRight
          className="h-4 w-4 shrink-0 text-[#94A3B8] transition duration-150 group-hover:translate-x-0.5 group-hover:text-[#1D5CE5]"
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
  tone?: Tone
  band?: boolean
}) {
  return (
    <section id={id} className={`section ${className}`}>
      {children}
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
      className={`flex rounded-lg border border-[rgba(7,19,48,0.1)] bg-[#F4F8FD] p-1 ${className}`}
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
            className={`btn-compact flex-1 rounded-md px-3 text-[13px] font-semibold capitalize transition ${
              selected
                ? 'bg-[#1D5CE5] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#071330]'
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
      className={`btn-compact h-9 shrink-0 rounded-lg px-3.5 text-[13px] font-semibold transition ${
        active
          ? 'bg-[#1D5CE5] text-white'
          : 'bg-white text-[#475569] ring-1 ring-[rgba(7,19,48,0.1)] hover:text-[#071330]'
      }`}
    >
      {label}
    </button>
  )
}

export function FlatDivider({ className = '' }: { className?: string }) {
  return <hr className={`border-0 border-t border-[rgba(7,19,48,0.08)] ${className}`} />
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
    <div className={`elevated overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-[rgba(7,19,48,0.08)] bg-[#F4F8FD] px-3.5 py-2.5">
        <p className="truncate type-meta text-[#64748B]">{url}</p>
        {toolbar}
      </div>
      {children}
    </div>
  )
}

export type FlatLinkProps = ComponentProps<typeof Link>
