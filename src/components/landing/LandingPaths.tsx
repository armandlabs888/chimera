import Link from 'next/link'
import { ArrowRight, HandHelping, Search } from 'lucide-react'
import { LandingSection } from '@/components/flat'

export function LandingPaths() {
  return (
    <LandingSection band>
      <div className="section-inner">
        <div className="max-w-2xl">
          <p className="flat-meta">Get started</p>
          <h2 className="mt-3 font-serif text-[clamp(2rem,3.6vw,3rem)] font-normal text-[#FAF8F4]">
            Two clear paths
          </h2>
          <p className="mt-2 text-[17px] text-[#A7A39C]">
            Need help today, or ready to offer it? Pick a lane — you can switch anytime.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <PathCard
            href="/post"
            icon={HandHelping}
            title="I need help"
            body="Post a structured request with budget, timing, and neighborhood. Helpers send priced offers."
            cta="Post a request"
          />
          <PathCard
            href="/browse"
            icon={Search}
            title="I can help"
            body="Browse open requests nearby. Send an offer with price and arrival window — coordinate in-thread."
            cta="Browse requests"
          />
        </div>
      </div>
    </LandingSection>
  )
}

function PathCard({
  href,
  icon: Icon,
  title,
  body,
  cta,
}: {
  href: string
  icon: typeof Search
  title: string
  body: string
  cta: string
}) {
  return (
    <Link href={href} className="elevated elevated-hover group flex flex-col p-6 sm:p-7 transition">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-[rgba(221,163,82,0.14)] text-[#E7B567]">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <h3 className="mt-5 font-serif text-[24px] text-[#FAF8F4]">{title}</h3>
      <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[#A7A39C]">{body}</p>
      <span className="mt-6 inline-flex items-center gap-2 text-[14.5px] font-medium text-[#DDA352] group-hover:text-[#E7B567]">
        {cta} <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  )
}
