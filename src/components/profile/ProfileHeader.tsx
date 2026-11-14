'use client'

import {
  ChevronDown,
  GraduationCap,
  Home,
  MapPin,
  Pencil,
  Share2,
  Star,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Avatar } from '@/components/ui'
import { formatLocation } from '@/lib/location'
import { formatPublicRating, hasPublicRating } from '@/lib/ratingDisplay'
import { formatCategoryLabel } from '@/lib/taxonomy'
import type { Person } from '@/types'

export type ProfileHeaderRole = 'helper' | 'neighbor'

export type ProfileHeaderAction = {
  key: string
  label: string
  icon?: ReactNode
  href?: string
  onClick?: () => void
  disabled?: boolean
  testId?: string
  type?: 'button' | 'submit'
}

export type ProfileHeaderOverflowItem = {
  key: string
  label: string
  icon?: ReactNode
  href?: string
  onClick?: () => void
  testId?: string
}

export type ProfileHeaderStatItem = {
  key: string
  content: ReactNode
}

export type ProfileHeaderMetaItem = {
  key: string
  icon: ReactNode
  label: string
}

const primaryBtnClass =
  'inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-full bg-[#1D5CE5] px-4 text-[14px] font-semibold text-white transition hover:bg-[#1649BD] disabled:opacity-40 sm:flex-none sm:min-h-[44px] sm:px-5'

const secondaryBtnClass =
  'inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-full bg-[#EEF2F7] px-4 text-[14px] font-semibold text-[#071330] transition hover:bg-[#E3E8EF] disabled:opacity-40 sm:flex-none sm:min-h-[44px] sm:px-5'

const overflowBtnClass =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#EEF2F7] text-[#071330] transition hover:bg-[#E3E8EF] sm:h-11 sm:w-11'

function ActionControl({
  action,
  className,
}: {
  action: ProfileHeaderAction
  className: string
}) {
  const content = (
    <>
      {action.icon}
      <span>{action.label}</span>
    </>
  )
  if (action.href) {
    return (
      <Link
        href={action.href}
        className={className}
        data-testid={action.testId}
        onClick={action.onClick}
      >
        {content}
      </Link>
    )
  }
  return (
    <button
      type={action.type ?? 'button'}
      className={className}
      data-testid={action.testId}
      disabled={action.disabled}
      onClick={action.onClick}
    >
      {content}
    </button>
  )
}

function Middot() {
  return (
    <span className="text-[#B0B8C6]" aria-hidden>
      ·
    </span>
  )
}

function OverflowMenu({ items }: { items: ProfileHeaderOverflowItem[] }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!items.length) return null

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        className={overflowBtnClass}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        data-testid="profile-header-overflow"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown className="h-5 w-5" strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-30 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-[#E3E8EF] bg-white py-1 shadow-[0_8px_24px_rgba(7,19,48,0.08)]"
        >
          {items.map((item) => {
            const inner = (
              <>
                {item.icon}
                <span>{item.label}</span>
              </>
            )
            const itemClass =
              'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[14px] font-semibold text-[#071330] hover:bg-[#EEF2F7]'
            if (item.href) {
              return (
                <Link
                  key={item.key}
                  role="menuitem"
                  href={item.href}
                  className={itemClass}
                  data-testid={item.testId}
                  onClick={() => {
                    item.onClick?.()
                    setOpen(false)
                  }}
                >
                  {inner}
                </Link>
              )
            }
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                className={itemClass}
                data-testid={item.testId}
                onClick={() => {
                  item.onClick?.()
                  setOpen(false)
                }}
              >
                {inner}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function buildHelperStats(person: Person): ProfileHeaderStatItem[] {
  const items: ProfileHeaderStatItem[] = []
  const ratingLabel = formatPublicRating(person)
  if (hasPublicRating(person) && ratingLabel) {
    items.push({
      key: 'rating',
      content: (
        <span className="inline-flex items-center gap-1 font-medium text-[#071330]">
          <Star className="h-3.5 w-3.5 fill-[#071330] text-[#071330]" aria-hidden />
          {ratingLabel}
        </span>
      ),
    })
    items.push({
      key: 'reviews',
      content: (
        <span>
          {person.reviewCount} {person.reviewCount === 1 ? 'review' : 'reviews'}
        </span>
      ),
    })
  }
  if (typeof person.jobsCompleted === 'number' && person.jobsCompleted > 0) {
    items.push({
      key: 'jobs',
      content: (
        <span>
          {person.jobsCompleted}{' '}
          {person.jobsCompleted === 1 ? 'job completed' : 'jobs completed'}
        </span>
      ),
    })
  }
  return items
}

export function buildNeighborStats(input: {
  jobsPosted?: number | null
  memberSinceLabel?: string | null
}): ProfileHeaderStatItem[] {
  const items: ProfileHeaderStatItem[] = []
  const posted = Number(input.jobsPosted ?? 0)
  if (posted > 0) {
    items.push({
      key: 'posted',
      content: (
        <span>
          {posted} {posted === 1 ? 'job posted' : 'jobs posted'}
        </span>
      ),
    })
  }
  const since = (input.memberSinceLabel ?? '').trim()
  if (since) {
    items.push({
      key: 'since',
      content: <span>Member since {since}</span>,
    })
  }
  return items
}

export function formatMemberSince(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(+d)) return null
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function buildRoleMeta(
  role: ProfileHeaderRole,
  person: Person,
  opts?: { skillLimit?: number },
): ProfileHeaderMetaItem[] {
  const items: ProfileHeaderMetaItem[] = []
  const RoleIcon: LucideIcon = role === 'helper' ? Wrench : Home
  items.push({
    key: 'role',
    icon: <RoleIcon className="h-3.5 w-3.5 shrink-0 text-[#5B6576]" strokeWidth={2.25} aria-hidden />,
    label: role === 'helper' ? 'Helper' : 'Neighbor',
  })

  const locationLabel = formatLocation(person)
  if (locationLabel) {
    items.push({
      key: 'location',
      icon: <MapPin className="h-3.5 w-3.5 shrink-0 text-[#5B6576]" strokeWidth={2.25} aria-hidden />,
      label: locationLabel,
    })
  }

  if (role === 'helper' && person.skills.length) {
    const limit = opts?.skillLimit ?? 2
    const labels = person.skills
      .slice(0, limit)
      .map((skill) =>
        formatCategoryLabel(skill, skill === 'other' ? person.otherSkillLabel : null),
      )
      .filter(Boolean)
    if (labels.length) {
      items.push({
        key: 'skills',
        icon: (
          <GraduationCap
            className="h-3.5 w-3.5 shrink-0 text-[#5B6576]"
            strokeWidth={2.25}
            aria-hidden
          />
        ),
        label: labels.join(', '),
      })
    }
  }

  return items
}

export async function shareProfileLink(input: {
  title: string
  url: string
}): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title: input.title, url: input.url })
      return 'shared'
    }
  } catch {
    // Fall through to clipboard when share is cancelled or unavailable.
  }
  try {
    await navigator.clipboard.writeText(input.url)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export function ProfileHeader({
  person,
  stats,
  meta,
  primaryAction,
  secondaryActions = [],
  overflowItems = [],
  belowActions,
  titleId,
  testId = 'profile-header',
}: {
  person: Person
  stats: ProfileHeaderStatItem[]
  meta: ProfileHeaderMetaItem[]
  primaryAction?: ProfileHeaderAction | null
  secondaryActions?: ProfileHeaderAction[]
  overflowItems?: ProfileHeaderOverflowItem[]
  /** Optional content under the action row (e.g. public book CTA on mobile). */
  belowActions?: ReactNode
  titleId?: string
  testId?: string
}) {
  const actions = (
    <div
      className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end"
      data-testid="profile-header-actions"
    >
      {primaryAction ? <ActionControl action={primaryAction} className={primaryBtnClass} /> : null}
      {secondaryActions.map((action) => (
        <ActionControl key={action.key} action={action} className={secondaryBtnClass} />
      ))}
      <OverflowMenu items={overflowItems} />
    </div>
  )

  const statsRow = stats.length ? (
    <p
      className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] font-medium text-[#4A5568] sm:text-[15px]"
      data-testid="profile-header-stats"
    >
      {stats.map((item, i) => (
        <span key={item.key} className="inline-flex items-center gap-2">
          {i > 0 ? <Middot /> : null}
          {item.content}
        </span>
      ))}
    </p>
  ) : null

  const metaRow = meta.length ? (
    <p
      className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-[#4A5568] sm:text-[13.5px]"
      data-testid="profile-header-meta"
    >
      {meta.map((item, i) => (
        <span key={item.key} className="inline-flex items-center gap-2">
          {i > 0 ? <Middot /> : null}
          <span className="inline-flex items-center gap-1.5">
            {item.icon}
            <span>{item.label}</span>
          </span>
        </span>
      ))}
    </p>
  ) : null

  return (
    <header className="bg-white" data-testid={testId}>
      <div className="h-[88px] bg-[#EEF2F7] sm:h-[104px]" data-testid="profile-header-cover" />

      <div className="relative pb-5 pt-0 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:gap-5">
          <div className="-mt-10 inline-flex w-fit shrink-0 rounded-full ring-4 ring-white sm:-mt-12">
            <Avatar src={person.avatar} name={person.name} size={100} />
          </div>

          <div className="mt-3 min-w-0 flex-1 sm:mt-0 sm:pt-1">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <h1
                  id={titleId}
                  className="font-display text-[32px] font-bold leading-[1.15] tracking-[-0.03em] text-[#071330] sm:text-[34px]"
                >
                  {person.name}
                </h1>
                {statsRow}
                {metaRow}
              </div>
              <div className="mt-4 sm:mt-0">{actions}</div>
            </div>
            {belowActions ? <div className="mt-3 sm:mt-4">{belowActions}</div> : null}
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-[#E3E8EF]" data-testid="profile-header-divider" />
    </header>
  )
}

/** Default Edit + Share icons for own-profile surfaces. */
export const ProfileHeaderIcons = {
  edit: <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden />,
  share: <Share2 className="h-4 w-4" strokeWidth={2} aria-hidden />,
}
