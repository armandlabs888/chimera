import Link from 'next/link'
import { ArrowRight, Package } from 'lucide-react'
import { LandingSection } from '@/components/flat'
import { Badge, CategoryIconBadge } from '@/components/ui'
import { CATEGORIES } from '@/data/categories'
import { EXAMPLE_LABEL } from './examples'

export function LandingCategories() {
  return (
    <LandingSection id="categories" band className="border-b border-black/[0.05]">
      <div className="section-inner">
        <div className="max-w-2xl">
          <span className="eyebrow-pill">Categories</span>
          <h2 className="mt-3 type-h1 text-beam-charcoal">Six practical scopes</h2>
          <p className="mt-2 type-intro text-beam-cream-dim">
            Photo-forward cards with tinted badges. Light handyman excludes licensed trades.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const example = cat.templates[0]
            return (
              <article key={cat.id} className="elevated elevated-hover flex flex-col overflow-hidden">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img src={cat.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                  <div className="absolute left-3 top-3 flex items-center gap-2">
                    <CategoryIconBadge tintBg={cat.tintBg} tintFg={cat.tintFg} size={36}>
                      <Package className="h-4 w-4" />
                    </CategoryIconBadge>
                    {cat.id === 'handyman' ? <Badge tone="warning">No licensed trades</Badge> : null}
                  </div>
                  <h3 className="absolute bottom-3 left-3 text-[17px] font-semibold text-white drop-shadow">
                    {cat.label}
                  </h3>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="type-sec text-beam-cream-dim">{cat.description}</p>
                  <p className="mt-3 type-meta text-beam-muted">
                    {EXAMPLE_LABEL}: {example.title}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/browse?category=${cat.id}`}
                      className="btn-compact inline-flex items-center gap-1 rounded-[10px] bg-white px-3 text-[13px] font-semibold text-beam-cream shadow-[0_0_0_1px_rgba(15,23,42,0.08)] hover:bg-beam-surface-2"
                    >
                      Browse <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={`/post?category=${cat.id}`}
                      className="btn-compact inline-flex items-center rounded-[10px] bg-beam-amber px-3 text-[13px] font-semibold text-beam-charcoal shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:bg-beam-amber-deep hover:text-white"
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
