import Link from 'next/link'
import { LandingSection } from '@/components/flat'

export function LandingPaths() {
  return (
    <LandingSection band className="border-b border-beam-line">
      <div className="section-inner grid gap-4 lg:grid-cols-2">
        <article className="flat-bento bg-beam-base p-5 sm:p-6">
          <p className="flat-meta text-beam-amber-deep">Requester</p>
          <h2 className="mt-2 type-h2 text-beam-charcoal">Need something done today</h2>
          <ul className="mt-4 space-y-2 type-sec text-beam-cream-dim">
            <li>Post category, when, neighborhood, and budget.</li>
            <li>Compare priced offers with arrival windows.</li>
            <li>Accept one helper and coordinate in-thread.</li>
            <li>Mark complete and leave a short review.</li>
          </ul>
          <Link
            href="/post"
            className="mt-6 inline-flex touch-target items-center justify-center rounded-[10px] bg-beam-amber px-4 text-[14px] font-semibold text-beam-charcoal hover:bg-beam-amber-deep"
          >
            Post a request
          </Link>
        </article>

        <article className="flat-bento bg-beam-base p-5 sm:p-6">
          <p className="flat-meta text-beam-amber-deep">Helper</p>
          <h2 className="mt-2 type-h2 text-beam-charcoal">Help neighbors nearby</h2>
          <ul className="mt-4 space-y-2 type-sec text-beam-cream-dim">
            <li>Browse open requests ranked by neighborhood distance.</li>
            <li>Send a priced offer with when you can arrive.</li>
            <li>Message after acceptance — stay scoped to the job.</li>
            <li>Complete, get reviewed, and review back.</li>
          </ul>
          <Link
            href="/browse"
            className="mt-6 inline-flex touch-target items-center justify-center rounded-[10px] border border-beam-line bg-beam-base px-4 text-[14px] font-semibold text-beam-cream hover:bg-beam-surface-2"
          >
            Browse requests
          </Link>
        </article>
      </div>
    </LandingSection>
  )
}
