import Link from 'next/link'
import { BeamProvider } from '@/context/BeamContext'
import { GuestSiteChrome } from '@/components/marketing/GuestSiteChrome'

export default function NotFound() {
  return (
    <BeamProvider nonBlocking>
      <GuestSiteChrome>
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
          <p className="font-display text-[22px] font-bold tracking-tight text-[#071330]">HouseCall</p>
          <h1 className="mt-4 type-h2 text-[#071330]">Page not found</h1>
          <p className="mt-2 max-w-md type-sec text-beam-muted">
            That route is not part of HouseCall. Try Browse, Post a task, or the HouseCall home page.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/"
              className="touch-target inline-flex items-center rounded-lg bg-[#1D5CE5] px-5 text-[14px] font-semibold text-white hover:bg-[#1649BD]"
            >
              HouseCall home
            </Link>
            <Link
              href="/browse"
              className="touch-target inline-flex items-center rounded-lg border border-beam-line bg-white px-5 text-[14px] font-semibold text-[#071330]"
            >
              Browse jobs
            </Link>
            <Link
              href="/post"
              className="touch-target inline-flex items-center rounded-lg border border-[#1D5CE5]/30 px-5 text-[14px] font-semibold text-[#1D5CE5]"
            >
              Post a task
            </Link>
          </div>
        </div>
      </GuestSiteChrome>
    </BeamProvider>
  )
}
