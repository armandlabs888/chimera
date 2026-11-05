import { StackSection, MetaLabel, FlatSurface } from '@/components/flat'
import { EXAMPLE_LABEL, EXAMPLE_OFFER, EXAMPLE_REQUEST, EXAMPLE_THREAD } from './examples'

function ExampleBadge() {
  return (
    <span className="inline-flex rounded-full border border-beam-amber/30 bg-beam-amber-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-beam-amber">
      {EXAMPLE_LABEL}
    </span>
  )
}

function RequestPanel() {
  return (
    <FlatSurface tone="ink" className="p-5 sm:p-6" as="article">
      <div className="mb-4 flex items-center justify-between gap-3">
        <MetaLabel className="text-beam-muted">Request</MetaLabel>
        <ExampleBadge />
      </div>
      <h3 className="font-display text-2xl font-semibold text-beam-cream">{EXAMPLE_REQUEST.title}</h3>
      <p className="mt-2 text-sm text-beam-cream-dim">{EXAMPLE_REQUEST.details}</p>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="flat-meta text-[10px] uppercase text-beam-muted">Where</dt>
          <dd className="mt-1 text-beam-cream">{EXAMPLE_REQUEST.neighborhood}</dd>
        </div>
        <div>
          <dt className="flat-meta text-[10px] uppercase text-beam-muted">When</dt>
          <dd className="mt-1 text-beam-cream">{EXAMPLE_REQUEST.when}</dd>
        </div>
        <div>
          <dt className="flat-meta text-[10px] uppercase text-beam-muted">Budget</dt>
          <dd className="mt-1 font-semibold text-beam-amber">{EXAMPLE_REQUEST.budget}</dd>
        </div>
        <div>
          <dt className="flat-meta text-[10px] uppercase text-beam-muted">Category</dt>
          <dd className="mt-1 text-beam-cream">{EXAMPLE_REQUEST.category}</dd>
        </div>
      </dl>
    </FlatSurface>
  )
}

function OfferPanel() {
  return (
    <FlatSurface tone="ink" className="p-5 sm:p-6 md:-translate-y-2" as="article">
      <div className="mb-4 flex items-center justify-between gap-3">
        <MetaLabel className="text-beam-muted">Offer</MetaLabel>
        <ExampleBadge />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold text-beam-cream">{EXAMPLE_OFFER.helper}</h3>
          <p className="mt-1 text-sm text-beam-muted">{EXAMPLE_OFFER.eta}</p>
        </div>
        <p className="font-display text-3xl font-semibold text-beam-amber">{EXAMPLE_OFFER.price}</p>
      </div>
      <p className="mt-4 rounded-xl bg-black/25 px-4 py-3 text-sm text-beam-cream-dim">{EXAMPLE_OFFER.note}</p>
    </FlatSurface>
  )
}

function ThreadPanel() {
  return (
    <FlatSurface tone="ink" className="p-5 sm:p-6" as="article">
      <div className="mb-4 flex items-center justify-between gap-3">
        <MetaLabel className="text-beam-muted">Message · complete</MetaLabel>
        <ExampleBadge />
      </div>
      <div className="space-y-3">
        <p className="max-w-[90%] rounded-2xl rounded-bl-md bg-beam-raised px-4 py-3 text-sm text-beam-cream">
          {EXAMPLE_THREAD.opener}
        </p>
        <p className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-beam-amber px-4 py-3 text-sm font-medium text-beam-base">
          {EXAMPLE_THREAD.reply}
        </p>
      </div>
      <p className="mt-4 text-xs text-beam-muted">
        After the job, mark complete and leave a review — both stay on the request thread.
      </p>
    </FlatSurface>
  )
}

/** Sticky stack section (viewport-safe). Panels are static flat examples — not live data. */
export function LandingProof() {
  return (
    <StackSection
      id="how-it-works"
      stick
      zIndex={2}
      tone="ink"
      className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto mb-10 max-w-3xl text-center md:mb-12">
        <MetaLabel>How it works</MetaLabel>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-beam-cream sm:text-4xl">
          Request → priced offer → coordinate
        </h2>
        <p className="mt-3 text-base text-beam-cream-dim">
          The same flow you use in Beam. Panels below are fixed examples for illustration — not live
          marketplace data.
        </p>
      </div>

      <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
        <RequestPanel />
        <OfferPanel />
        <ThreadPanel />
      </div>
    </StackSection>
  )
}
