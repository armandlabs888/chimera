import { StackSection, MetaLabel, FlatSurface } from '@/components/flat'
import { EXAMPLE_LABEL, EXAMPLE_OFFER, EXAMPLE_REQUEST, EXAMPLE_THREAD } from './examples'

function ExampleBadge() {
  return (
    <span className="inline-flex rounded-full border border-beam-amber/30 bg-beam-amber-soft px-2 py-0.5 type-meta text-beam-amber-deep">
      {EXAMPLE_LABEL}
    </span>
  )
}

function RequestPanel() {
  return (
    <FlatSurface className="p-4" as="article">
      <div className="mb-3 flex items-center justify-between gap-3">
        <MetaLabel>Request</MetaLabel>
        <ExampleBadge />
      </div>
      <h3 className="type-h3 text-beam-cream">{EXAMPLE_REQUEST.title}</h3>
      <p className="mt-1.5 type-sec text-beam-muted">{EXAMPLE_REQUEST.details}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 type-sec">
        <div>
          <dt className="type-meta text-beam-muted">Where</dt>
          <dd className="mt-0.5 font-medium text-beam-cream">{EXAMPLE_REQUEST.neighborhood}</dd>
        </div>
        <div>
          <dt className="type-meta text-beam-muted">When</dt>
          <dd className="mt-0.5 font-medium text-beam-cream">{EXAMPLE_REQUEST.when}</dd>
        </div>
        <div>
          <dt className="type-meta text-beam-muted">Budget</dt>
          <dd className="mt-0.5 font-semibold text-beam-cream">{EXAMPLE_REQUEST.budget}</dd>
        </div>
        <div>
          <dt className="type-meta text-beam-muted">Category</dt>
          <dd className="mt-0.5 font-medium text-beam-cream">{EXAMPLE_REQUEST.category}</dd>
        </div>
      </dl>
    </FlatSurface>
  )
}

function OfferPanel() {
  return (
    <FlatSurface className="p-4" as="article">
      <div className="mb-3 flex items-center justify-between gap-3">
        <MetaLabel>Offer</MetaLabel>
        <ExampleBadge />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[17px] font-semibold text-beam-cream">{EXAMPLE_OFFER.helper}</h3>
          <p className="mt-0.5 type-sec text-beam-muted">{EXAMPLE_OFFER.eta}</p>
        </div>
        <p className="text-[24px] font-semibold tracking-tight text-beam-cream">{EXAMPLE_OFFER.price}</p>
      </div>
      <p className="mt-3 rounded-[10px] bg-beam-ink px-3 py-2.5 type-sec text-beam-cream-dim">
        {EXAMPLE_OFFER.note}
      </p>
    </FlatSurface>
  )
}

function ThreadPanel() {
  return (
    <FlatSurface className="p-4" as="article">
      <div className="mb-3 flex items-center justify-between gap-3">
        <MetaLabel>Message · complete</MetaLabel>
        <ExampleBadge />
      </div>
      <div className="space-y-2">
        <p className="max-w-[90%] rounded-[12px] rounded-bl-md bg-beam-ink px-3 py-2 type-sec text-beam-cream">
          {EXAMPLE_THREAD.opener}
        </p>
        <p className="ml-auto max-w-[90%] rounded-[12px] rounded-br-md bg-beam-amber px-3 py-2 type-sec font-medium text-beam-charcoal">
          {EXAMPLE_THREAD.reply}
        </p>
      </div>
      <p className="mt-3 type-meta text-beam-muted">
        After the job, mark complete and leave a review on the thread.
      </p>
    </FlatSurface>
  )
}

export function LandingProof() {
  return (
    <StackSection
      id="how-it-works"
      stick
      zIndex={2}
      tone="ink"
      className="scroll-mt-16 border-t border-beam-line px-4 py-12 sm:px-6 sm:py-14"
    >
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <MetaLabel className="text-beam-amber">How it works</MetaLabel>
        <h2 className="mt-2 type-h2 text-beam-cream">Request → priced offer → coordinate</h2>
        <p className="mt-2 type-sec text-beam-muted">
          Fixed examples for illustration — not live marketplace data.
        </p>
      </div>

      <div className="mx-auto grid max-w-5xl gap-3 md:grid-cols-3">
        <RequestPanel />
        <OfferPanel />
        <ThreadPanel />
      </div>
    </StackSection>
  )
}
