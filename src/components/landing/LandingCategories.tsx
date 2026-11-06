import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { LandingSection } from '@/components/flat'
import { CATEGORIES } from '@/data/categories'

export function LandingCategories() {
  return (
    <LandingSection id="categories" band>
      <div className="section-inner">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="flat-meta">Categories</p>
            <h2 className="mt-3 font-serif text-[clamp(2rem,3.6vw,3rem)] font-normal text-[#FAF8F4]">
              Six scopes. Clear intent.
            </h2>
            <p className="mt-2 text-[17px] text-[#A7A39C]">
              Browse open requests by category — each with a warm tint for at-a-glance scanning.
            </p>
          </div>
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#DDA352] hover:text-[#E7B567] transition"
          >
            Browse all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link
                href={`/browse?category=${c.id}`}
                className="elevated elevated-hover group flex h-full flex-col p-5 transition"
              >
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] text-[13px] font-bold"
                  style={{ background: 'rgba(221,163,82,0.14)', color: '#E7B567' }}
                >
                  {c.shortLabel}
                </span>
                <h3 className="mt-4 font-serif text-[20px] text-[#FAF8F4] group-hover:text-white">
                  {c.label}
                </h3>
                <p className="mt-1.5 flex-1 type-sec text-[#A7A39C]">{c.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-[#DDA352]">
                  View requests <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </LandingSection>
  )
}
