import Link from 'next/link'
import { CATEGORIES } from '@/data/categories'

const NOTES: Record<string, string> = {
  handyman: 'Light fixes only — not licensed trades',
}

export function LandingCategories() {
  return (
    <section id="categories" className="relative scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
      <div className="pointer-events-none absolute inset-x-0 top-1/3 h-64 landing-glow-soft" aria-hidden />
      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="landing-meta text-[11px] font-medium uppercase tracking-[0.22em] text-beam-amber">
            Categories
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-beam-cream sm:text-4xl">
            Practical jobs, on purpose
          </h2>
          <p className="mt-3 text-base text-beam-cream-dim">
            Six focused categories. Each card opens Beam browse with that filter applied.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat, index) => (
            <Link
              key={cat.id}
              href={`/browse?category=${cat.id}`}
              className={`landing-glass landing-bento group relative overflow-hidden p-5 transition hover:border-beam-amber/35 ${
                index % 3 === 1 ? 'lg:translate-y-6' : index % 3 === 2 ? 'lg:translate-y-3' : ''
              }`}
            >
              <div className="absolute inset-0 opacity-40 transition duration-500 group-hover:opacity-60">
                <img
                  src={cat.image}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-beam-base via-beam-base/80 to-beam-base/40" />
              </div>
              <div className="relative">
                <p className="landing-meta text-[10px] uppercase tracking-[0.18em] text-beam-amber">
                  Browse
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold text-beam-cream">{cat.label}</h3>
                <p className="mt-2 text-sm text-beam-cream-dim">{cat.description}</p>
                {NOTES[cat.id] ? (
                  <p className="mt-3 text-xs text-beam-muted">{NOTES[cat.id]}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
