'use client'

import { Search } from 'lucide-react'
import Link from 'next/link'

export function BrowseFilteredEmpty({
  title,
  body,
  onReset,
  resetLabel = 'Reset filters',
  postHref = '/post',
  postLabel = 'Post a task',
  suggestions = [],
}: {
  title: string
  body: string
  onReset: () => void
  resetLabel?: string
  postHref?: string
  postLabel?: string
  suggestions?: { label: string; onClick: () => void }[]
}) {
  return (
    <div
      className="mt-9 rounded-xl border border-[#E3E8EF] bg-gradient-to-b from-[#F4F8FD] to-white px-6 py-12 text-center sm:px-8 sm:py-14"
      data-testid="browse-filtered-empty"
    >
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl border border-[#D6E2F5] bg-white text-[#1D5CE5] shadow-[0_6px_16px_-8px_rgba(29,92,229,0.4)]">
        <Search className="h-6 w-6" strokeWidth={1.9} aria-hidden />
      </span>
      <h2 className="mt-4 text-[21px] font-bold tracking-[-0.02em] text-[#071330]">{title}</h2>
      <p className="mx-auto mt-2 max-w-[420px] text-[15px] leading-relaxed text-[#273449]">{body}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-12 items-center justify-center rounded-[10px] border border-[#CDD5E0] bg-white px-5 text-[15px] font-semibold text-[#071330] transition hover:bg-[#F4F8FD]"
          data-testid="browse-reset-filters"
        >
          {resetLabel}
        </button>
        <Link
          href={postHref}
          className="inline-flex h-12 items-center justify-center rounded-[10px] bg-[#1D5CE5] px-5 text-[15px] font-semibold text-white transition hover:bg-[#1649BD]"
          data-testid="browse-empty-post-cta"
        >
          {postLabel}
        </Link>
      </div>
      {suggestions.length ? (
        <p className="mt-6 text-[13.5px] text-[#3D4A5F]">
          Or try:{' '}
          {suggestions.map((s, i) => (
            <span key={s.label}>
              {i > 0 ? <span className="mx-1.5 text-[#CDD5E0]">·</span> : null}
              <button
                type="button"
                onClick={s.onClick}
                className="font-semibold text-[#1D5CE5] hover:underline"
              >
                {s.label}
              </button>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  )
}
