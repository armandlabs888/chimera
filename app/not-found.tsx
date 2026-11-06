import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-beam-base px-4 text-center">
      <p className="text-[22px] font-semibold tracking-tight text-[#FAF8F4]">Beam</p>
      <h1 className="mt-4 type-h2 text-beam-cream">Page not found</h1>
      <p className="mt-2 max-w-md type-sec text-beam-muted">
        That route is not part of Beam. Try Browse, Post, or the app home.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/home"
          className="touch-target inline-flex items-center rounded-[10px] bg-[#16181D] px-4 text-[14px] font-semibold text-[#F7F4EE]"
        >
          App home
        </Link>
        <Link
          href="/browse"
          className="touch-target inline-flex items-center rounded-[10px] border border-beam-line px-4 text-[14px] font-medium text-beam-cream"
        >
          Browse
        </Link>
        <Link
          href="/post"
          className="touch-target inline-flex items-center rounded-[10px] bg-beam-amber px-4 text-[14px] font-semibold text-[#FAF8F4]"
        >
          Post a request
        </Link>
        <Link
          href="/"
          className="touch-target inline-flex items-center px-3 text-[14px] font-medium text-beam-muted hover:underline"
        >
          Marketing
        </Link>
      </div>
    </div>
  )
}
