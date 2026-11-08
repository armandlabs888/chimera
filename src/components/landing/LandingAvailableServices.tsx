'use client'

import Link from 'next/link'
import { useId, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { CATEGORY_ICONS } from '@/lib/categoryIcons'
import {
  SERVICE_CATEGORIES,
  type ServiceCategoryId,
} from '@/lib/taxonomy'

/**
 * Framed “Available services on Beam” strip — replaces the yellow scalloped chip row.
 * Types Beam supports (not live helper supply / counts / prices).
 */
const AVAILABLE_SERVICE_IDS: ServiceCategoryId[] = [
  'house-cleaning',
  'carpet-cleaning',
  'auto-detailing',
  'junk-removal',
  'pet-sitting',
  'grooming',
  'other',
]

const SERVICE_BLURBS: Record<ServiceCategoryId, string> = {
  'house-cleaning':
    'Everyday home cleans — kitchens, baths, and tidy resets from neighbors who know the drill.',
  'carpet-cleaning':
    'Room, stair, and spot carpet help when a vacuum alone will not cut it.',
  'auto-detailing':
    'Interior and exterior car detailing at your place — casual, non-shop help.',
  'junk-removal':
    'Haul-away for household junk and clutter when you need an extra set of hands and a truck.',
  'pet-sitting':
    'Drop-ins, walks, and sitting for pets you already know how to care for at home.',
  grooming:
    'At-home bath, brush, and nail trims — friendly pet help, not a clinic or salon.',
  other:
    'Custom everyday tasks that still fit Beam’s casual local-help rules — describe what you need.',
}

const SERVICES = AVAILABLE_SERVICE_IDS.map((id) => {
  const cat = SERVICE_CATEGORIES.find((c) => c.id === id)!
  return {
    id: cat.id,
    label: cat.label,
    description: SERVICE_BLURBS[cat.id],
    icon: CATEGORY_ICONS[cat.id],
  }
})

export function LandingAvailableServices() {
  const [selectedId, setSelectedId] = useState<ServiceCategoryId>('house-cleaning')
  const headingId = useId()
  const groupId = useId()
  const selected = SERVICES.find((s) => s.id === selectedId) ?? SERVICES[0]
  const SelectedIcon = selected.icon

  return (
    <div
      id="neighborhoods"
      className="mt-16 border-y border-[#C7D7F0] bg-[#EEF4FF] py-12 sm:mt-20 sm:py-14"
      data-testid="available-services"
    >
      <div className="beam-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex rounded-md bg-[#1D5CE5] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
            On Beam
          </p>
          <h2
            id={headingId}
            className="mt-3 font-display text-[clamp(1.65rem,3vw,2.35rem)] font-bold leading-[1.15] tracking-[-0.02em] text-[#071330] text-balance"
          >
            Available services on Beam
          </h2>
          <p className="mx-auto mt-2.5 max-w-[46ch] text-[15px] leading-[1.55] text-[#334155]">
            Service types Beam supports today — pick one to see what it covers, then browse open
            tasks in that category.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-stretch lg:gap-5">
          <div
            role="group"
            aria-labelledby={groupId}
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5"
            data-testid="available-services-group"
          >
            <p id={groupId} className="sr-only">
              Choose a service type Beam supports
            </p>
            {SERVICES.map((service) => {
              const Icon = service.icon
              const pressed = service.id === selectedId
              return (
                <button
                  key={service.id}
                  type="button"
                  aria-pressed={pressed}
                  data-testid={`available-service-${service.id}`}
                  data-selected={pressed ? 'true' : 'false'}
                  onClick={() => setSelectedId(service.id)}
                  style={
                    pressed
                      ? {
                          backgroundColor: '#1D5CE5',
                          color: '#FFFFFF',
                          borderColor: '#1D5CE5',
                        }
                      : {
                          backgroundColor: '#FFFFFF',
                          color: '#071330',
                          borderColor: '#64748B',
                        }
                  }
                  className="flex min-h-[72px] flex-col items-start gap-2 rounded-[10px] border px-3 py-3 text-left shadow-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#EEF4FF] motion-safe:hover:-translate-y-0.5 motion-reduce:transform-none data-[selected=true]:shadow-[0_12px_28px_-16px_rgba(29,92,229,0.65)]"
                >
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[8px]"
                    style={
                      pressed
                        ? { backgroundColor: 'rgba(255,255,255,0.18)', color: '#FFFFFF' }
                        : { backgroundColor: '#DBEAFE', color: '#1D5CE5' }
                    }
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <span className="text-[13px] font-semibold leading-snug sm:text-[13.5px]">
                    {service.label}
                  </span>
                </button>
              )
            })}
          </div>

          <div
            className="flex flex-col justify-between rounded-[12px] border border-[#1D5CE5]/25 bg-white p-5 shadow-[0_16px_40px_-24px_rgba(7,19,48,0.35)] sm:p-6"
            data-testid="available-services-detail"
            aria-live="polite"
          >
            <div>
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#EEF4FF] text-[#1D5CE5]"
                  aria-hidden
                >
                  <SelectedIcon className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1D5CE5]">
                    Service type
                  </p>
                  <h3 className="truncate text-[18px] font-bold text-[#071330]">{selected.label}</h3>
                </div>
              </div>
              <p
                className="mt-3 text-[14.5px] leading-[1.55] text-[#334155]"
                data-testid="available-services-blurb"
              >
                {selected.description}
              </p>
              <p className="mt-3 text-[12.5px] leading-snug text-[#475569]">
                Browse shows open tasks neighbors posted in this category — not a live helper
                roster or guaranteed availability.
              </p>
            </div>

            <Link
              href={`/browse?category=${selected.id}`}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#1D5CE5] px-4 text-[14.5px] font-semibold text-white transition hover:bg-[#1649BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto"
              data-testid="available-services-browse"
            >
              Browse {selected.label}
              <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
