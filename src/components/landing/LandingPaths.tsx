import Link from 'next/link'
import { HandHelping, ClipboardList } from 'lucide-react'
import { LandingSection } from '@/components/flat'

export function LandingPaths() {
  return (
    <LandingSection band className="border-b border-black/[0.05]">
      <div className="section-inner grid gap-4 lg:grid-cols-2">
        <article className="elevated elevated-hover p-5 sm:p-6">
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px]"
            style={{ background: '#FEF3C7', color: '#B45309' }}
          >
            <ClipboardList className="h-5 w-5" />
          </span>
          <h2 className="mt-3 type-h2 text-beam-charcoal">Need something done</h2>
          <ul className="mt-3 space-y-2 type-sec text-beam-cream-dim">
            <li>Post category, when, neighborhood, and budget.</li>
            <li>Compare priced offers with arrival windows.</li>
            <li>Accept, message, complete, and review.</li>
          </ul>
          <Link
            href="/post"
            className="mt-5 inline-flex touch-target items-center justify-center rounded-[12px] bg-beam-amber px-4 text-[14px] font-semibold text-beam-charcoal shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:bg-beam-amber-deep hover:text-white"
          >
            Post a request
          </Link>
        </article>

        <article className="elevated elevated-hover p-5 sm:p-6">
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px]"
            style={{ background: '#D1FAE5', color: '#047857' }}
          >
            <HandHelping className="h-5 w-5" />
          </span>
          <h2 className="mt-3 type-h2 text-beam-charcoal">Help neighbors nearby</h2>
          <ul className="mt-3 space-y-2 type-sec text-beam-cream-dim">
            <li>Browse open requests ranked by distance.</li>
            <li>Send a priced offer with when you can arrive.</li>
            <li>Coordinate in-thread after acceptance.</li>
          </ul>
          <Link
            href="/browse"
            className="mt-5 inline-flex touch-target items-center justify-center rounded-[12px] bg-white px-4 text-[14px] font-semibold text-beam-cream shadow-[0_0_0_1px_rgba(15,23,42,0.08)] hover:bg-beam-surface-2"
          >
            Browse requests
          </Link>
        </article>
      </div>
    </LandingSection>
  )
}
