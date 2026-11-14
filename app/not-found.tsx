import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-beam-base px-4 text-center">
      <p className="text-[22px] font-semibold tracking-tight text-[#071330]">HouseCall</p>
      <h1 className="mt-4 type-h2 text-beam-cream">Page not found</h1>
      <p className="mt-2 max-w-md type-sec text-beam-muted">
        That route is not part of HouseCall. Try Browse, Post, or the app home.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/home"
          className="touch-target inline-flex items-center rounded-lg bg-[#1D5CE5] px-5 text-[14px] font-semibold text-white hover:bg-[#1649BD]"
        >
          App home
        </Link>
        <Link
          href="/browse"
          className="touch-target inline-flex items-center rounded-lg border border-beam-line bg-white px-5 text-[14px] font-semibold text-beam-cream"
        >
          Browse jobs
        </Link>
        <Link
          href="/post"
          className="touch-target inline-flex items-center rounded-lg border border-[#1D5CE5]/30 px-5 text-[14px] font-semibold text-[#1D5CE5]"
        >
          Post a task
        </Link>
        <Link
          href="/"
          className="touch-target inline-flex items-center px-3 text-[14px] font-medium text-beam-muted hover:underline"
        >
          HouseCall home
        </Link>
      </div>
    </div>
  )
}
