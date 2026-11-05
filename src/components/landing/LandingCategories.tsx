import { ArrowRight } from 'lucide-react'
import { CATEGORIES } from '@/data/categories'
import { StackSection, MetaLabel, FlatBento } from '@/components/flat'

const NOTES: Record<string, string> = {
  handyman: 'Light fixes only — not licensed trades',
}

/**
 * Tall category grid — intentionally NOT sticky (content taller than viewport).
 * See docs/flat-ui.md exceptions.
 */
export function LandingCategories() {
  return (
    <StackSection
      id="categories"
      stick={false}
      zIndex={3}
      tone="base"
      className="relative scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="pointer-events-none absolute inset-x-0 top-1/4 h-64 landing-glow-soft" aria-hidden />
      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <MetaLabel>Categories</MetaLabel>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-beam-cream sm:text-4xl">
            Practical jobs, on purpose
          </h2>
          <p className="mt-3 text-base text-beam-cream-dim">
            Six focused categories. Each opens Beam browse with that filter applied.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat, index) => (
            <FlatBento
              key={cat.id}
              href={`/browse?category=${cat.id}`}
              className={`p-5 ${index % 3 === 1 ? 'lg:mt-6' : index % 3 === 2 ? 'lg:mt-3' : ''}`}
            >
              <div className="absolute inset-0 opacity-35 transition duration-500 group-hover:opacity-50">
                <img src={cat.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-beam-base via-beam-base/85 to-beam-base/45" />
              </div>
              <div className="relative">
                <MetaLabel className="text-[10px]">Browse</MetaLabel>
                <h3 className="mt-2 font-display text-2xl font-semibold text-beam-cream">{cat.label}</h3>
                <p className="mt-2 text-sm text-beam-cream-dim">{cat.description}</p>
                {NOTES[cat.id] ? <p className="mt-3 text-xs text-beam-muted">{NOTES[cat.id]}</p> : null}
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-beam-amber transition group-hover:gap-2">
                  Open filter
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </div>
            </FlatBento>
          ))}
        </div>
      </div>
    </StackSection>
  )
}
