import { ArrowRight } from 'lucide-react'
import { CATEGORIES } from '@/data/categories'
import { LandingSection, MetaLabel, FlatBento } from '@/components/flat'

const NOTES: Record<string, string> = {
  handyman: 'Light fixes only — not licensed trades',
}

export function LandingCategories() {
  return (
    <LandingSection
      id="categories"
      tone="base"
      fullPage
      className="border-t border-beam-line px-4 sm:px-6"
    >
      <div className="mx-auto max-w-[72rem]">
        <div className="max-w-xl">
          <MetaLabel className="text-beam-amber">Categories</MetaLabel>
          <h2 className="mt-2 type-h2 text-beam-cream">Practical jobs, on purpose</h2>
          <p className="mt-2 type-sec text-beam-muted">
            Six focused categories. Each opens browse with that filter.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <FlatBento key={cat.id} href={`/browse?category=${cat.id}`} className="p-4">
              <div className="absolute inset-0">
                <img src={cat.image} alt="" className="h-full w-full object-cover opacity-90" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/15" />
              </div>
              <div className="relative min-h-[9.5rem] text-white">
                <MetaLabel className="text-white/80">Browse</MetaLabel>
                <h3 className="mt-1.5 text-[20px] font-semibold tracking-tight">{cat.label}</h3>
                <p className="mt-1 type-sec text-white/85">{cat.description}</p>
                {NOTES[cat.id] ? <p className="mt-2 type-meta text-white/70">{NOTES[cat.id]}</p> : null}
                <span className="mt-3 inline-flex items-center gap-1 type-sec font-medium text-beam-amber transition duration-150 group-hover:gap-1.5">
                  Open filter
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
            </FlatBento>
          ))}
        </div>
      </div>
    </LandingSection>
  )
}
