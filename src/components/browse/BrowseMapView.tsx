'use client'

import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { getCategory } from '@/data/categories'
import { formatBudget } from '@/lib/matching'
import type { HelpRequest, Person } from '@/types'

type Plottable = {
  id: string
  href: string
  title: string
  meta: string
  tint: string
  x: number
  y: number
}

function projectPins(
  items: { id: string; lat?: number | null; lng?: number | null }[],
  origin: { lat?: number | null; lng?: number | null },
): { id: string; x: number; y: number }[] {
  const withCoords = items.filter(
    (i) => i.lat != null && i.lng != null && Number.isFinite(i.lat) && Number.isFinite(i.lng),
  )
  if (!withCoords.length) return []

  const originLat = origin.lat ?? withCoords.reduce((s, i) => s + (i.lat as number), 0) / withCoords.length
  const originLng = origin.lng ?? withCoords.reduce((s, i) => s + (i.lng as number), 0) / withCoords.length

  const projected = withCoords.map((i) => {
    const dx = ((i.lng as number) - originLng) * 8000
    const dy = ((originLat as number) - (i.lat as number)) * 8000
    return { id: i.id, dx, dy }
  })

  const max = Math.max(40, ...projected.map((p) => Math.hypot(p.dx, p.dy)))
  return projected.map((p) => ({
    id: p.id,
    x: 50 + (p.dx / max) * 38,
    y: 50 + (p.dy / max) * 38,
  }))
}

export function BrowseMapView({
  requests,
  people,
  mode,
  origin,
}: {
  requests: HelpRequest[]
  people: Person[]
  mode: 'requests' | 'people'
  origin: Pick<Person, 'lat' | 'lng'>
}) {
  const plots: Plottable[] =
    mode === 'requests'
      ? (() => {
          const coords = projectPins(requests, origin)
          return requests
            .map((r) => {
              const pin = coords.find((c) => c.id === r.id)
              if (!pin) return null
              const cat = getCategory(r.category)
              return {
                id: r.id,
                href: `/requests/${r.id}`,
                title: r.title,
                meta: `${cat.shortLabel} · ${formatBudget(r)}`,
                tint: cat.tintFg,
                x: pin.x,
                y: pin.y,
              }
            })
            .filter(Boolean) as Plottable[]
        })()
      : (() => {
          const coords = projectPins(people, origin)
          return people
            .map((p) => {
              const pin = coords.find((c) => c.id === p.id)
              if (!pin) return null
              return {
                id: p.id,
                href: `/people/${p.id}`,
                title: p.name,
                meta: p.skills
                  .slice(0, 2)
                  .map((s) => getCategory(s).shortLabel)
                  .join(' · '),
                tint: '#1D5CE5',
                x: pin.x,
                y: pin.y,
              }
            })
            .filter(Boolean) as Plottable[]
        })()

  return (
    <div
      className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white"
      data-testid="browse-map-view"
    >
      <div className="relative aspect-[16/10] min-h-[280px] w-full bg-[linear-gradient(180deg,#F8FBFF_0%,#EEF3FB_100%)]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
          {[18, 32, 46].map((r) => (
            <circle
              key={r}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#D7E2F2"
              strokeWidth="0.35"
            />
          ))}
          <circle cx="50" cy="50" r="1.6" fill="#1D5CE5" />
        </svg>

        {plots.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <MapPin className="h-5 w-5 text-[#94A3B8]" aria-hidden />
            <p className="text-[14px] font-semibold text-[#071330]">No mappable pins yet</p>
            <p className="max-w-[36ch] text-[13px] text-[#64748B]">
              Listings need coordinates to appear on the map. Switch to List to browse everything.
            </p>
          </div>
        ) : (
          <ul className="absolute inset-0">
            {plots.map((p) => (
              <li
                key={p.id}
                className="absolute -translate-x-1/2 -translate-y-full"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <Link
                  href={p.href}
                  className="group flex flex-col items-center"
                  title={p.title}
                >
                  <span className="mb-1 max-w-[10rem] truncate rounded-md border border-[#E2E8F0] bg-white px-2 py-1 text-[11px] font-semibold text-[#071330] opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-visible:opacity-100">
                    {p.title}
                  </span>
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: p.tint }}
                  >
                    <MapPin className="h-3.5 w-3.5 text-white" strokeWidth={2.25} aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {plots.length > 0 ? (
        <ul className="divide-y divide-[#F1F5F9] border-t border-[#E2E8F0]">
          {plots.slice(0, 6).map((p) => (
            <li key={`row-${p.id}`}>
              <Link
                href={p.href}
                className="flex items-center justify-between gap-3 px-4 py-2.5 transition hover:bg-[#F8FAFC]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-[#071330]">
                    {p.title}
                  </span>
                  <span className="block truncate text-[12px] text-[#64748B]">{p.meta}</span>
                </span>
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
