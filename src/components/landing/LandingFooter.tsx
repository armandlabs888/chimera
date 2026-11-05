import Link from 'next/link'

export function LandingFooter() {
  return (
    <footer className="border-t border-white/5 px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-xl font-semibold text-beam-cream">Beam</p>
          <p className="mt-1 text-sm text-beam-muted">Help nearby. Done today. · Austin</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-beam-cream-dim" aria-label="Footer">
          <a href="#how-it-works" className="touch-target hover:text-beam-cream">
            How it works
          </a>
          <a href="#categories" className="touch-target hover:text-beam-cream">
            Categories
          </a>
          <Link href="/browse" className="touch-target hover:text-beam-cream">
            Browse
          </Link>
          <Link href="/post" className="touch-target hover:text-beam-cream">
            Post
          </Link>
          <Link href="/safety" className="touch-target hover:text-beam-cream">
            Safety
          </Link>
          <Link href="/you" className="touch-target hover:text-beam-cream">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  )
}
