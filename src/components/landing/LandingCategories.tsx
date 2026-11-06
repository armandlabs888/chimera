import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { LandingSection } from '@/components/flat'
import { Badge } from '@/components/ui'
import { CATEGORIES } from '@/data/categories'
import { EXAMPLE_LABEL } from './examples'

export function LandingCategories() {
  return (
    <LandingSection id="categories" band className="border-b border-beam-line">
      <div className="section-inner">
        <div className="max-w-2xl">
          <p className="flat-meta text-beam-amber-deep">Categories</p>
          <h2 className="mt-2 type-h1 text-beam-charcoal">Six practical scopes</h2>
          <p className="mt-2 type-intro text-beam-cream-dim">
            Beam stays focused on neighborhood help you can describe clearly. Light handyman
            excludes licensed trades.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const example = cat.templates[0]
            return (
              <article key={cat.id} className="flat-bento flex flex-col overflow-hidden bg-beam-base">
                <div className="border-b border-beam-line bg-beam-surface-2 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[16px] font-semibold text-beam-cream">{cat.label}</h3>
                    {cat.id === 'handyman' ? (
                      <Badge tone="warning">No licensed trades</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 type-sec text-beam-muted">{cat.description}</p>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="type-meta text-beam-muted">Typical request · {EXAMPLE_LABEL}</p>
                  <p className="mt-1 text-[14px] font-medium text-beam-cream">{example.title}</p>
                  <p className="mt-1 line-clamp-2 type-sec text-beam-muted">{example.details}</p>
                  <p className="mt-2 tabular-nums type-sec font-semibold text-beam-cream">
                    Budget hint ${example.budgetHint}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/browse?category=${cat.id}`}
                      className="btn-compact inline-flex items-center gap-1 rounded-[8px] border border-beam-line px-3 text-[13px] font-medium text-beam-cream hover:bg-beam-surface-2"
                    >
                      Browse <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={`/post?category=${cat.id}`}
                      className="btn-compact inline-flex items-center rounded-[8px] bg-beam-amber px-3 text-[13px] font-semibold text-beam-charcoal hover:bg-beam-amber-deep"
                    >
                      Post
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </LandingSection>
  )
}
