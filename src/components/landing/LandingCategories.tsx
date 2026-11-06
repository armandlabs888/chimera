import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { LandingSection } from '@/components/flat'
import { CATEGORIES } from '@/data/categories'

export function LandingCategories() {
  return (
    <LandingSection id="categories">
      <div className="beam-container">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2
            className="font-serif text-[clamp(2.25rem,3.9vw,3.5rem)] font-normal leading-[1.05] tracking-[-0.018em] text-[#F6F3EE]"
            style={{ fontVariationSettings: "'opsz' 72" }}
          >
            What neighbors ask for
          </h2>
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[#D6B06C] transition hover:text-[#E2B66A]"
          >
            Browse all requests <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-4 max-w-[44ch] text-[19px] leading-[1.5] text-[#B7B2AA]">
          Six kinds of practical help, priced by your neighbors.
        </p>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link
                href={`/browse?category=${c.id}`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-[#141518] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E2B66A] lg:aspect-auto lg:h-[300px]"
              >
                <Image
                  fill
                  src={c.image}
                  alt=""
                  sizes="(min-width:1024px) 400px, 50vw"
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(8,8,10,.85)_100%)]" />
                <div className="absolute inset-x-3 bottom-3 sm:inset-x-5 sm:bottom-5 lg:inset-x-6 lg:bottom-6">
                  <h3
                    className="font-serif text-[18px] font-normal leading-[1.15] tracking-[-0.01em] text-[#F6F3EE] sm:text-[24px] lg:text-[28px]"
                    style={{ fontVariationSettings: "'opsz' 72" }}
                  >
                    {c.label}
                  </h3>
                  <p className="mt-1 text-[11px] leading-[1.4] tracking-[0.01em] text-[#B7B2AA] sm:mt-1.5 sm:text-[13px]">
                    Typical {c.typicalRange} · {c.arrival}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[13px] text-[#85817A]">
          Typical budgets from example requests. Helpers set their own offers.
        </p>
      </div>
    </LandingSection>
  )
}
