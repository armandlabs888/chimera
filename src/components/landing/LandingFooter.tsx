import Link from 'next/link'

/** Light conventional footer (no dark band). */
export function LandingFooter() {
  return (
    <footer className="border-t border-beam-line bg-beam-base px-4 py-10 text-beam-cream sm:px-6">
      <div className="mx-auto flex max-w-[72rem] flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[17px] font-semibold tracking-tight text-beam-charcoal">Beam</p>
          <p className="mt-1 type-sec text-beam-muted">Help nearby. Done today. · Austin</p>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 type-sec text-beam-muted" aria-label="Footer">
          <a href="#how-it-works" className="hover:text-beam-cream">
            How it works
          </a>
          <a href="#categories" className="hover:text-beam-cream">
            Categories
          </a>
          <Link href="/browse" className="hover:text-beam-cream">
            Browse
          </Link>
          <Link href="/post" className="hover:text-beam-cream">
            Post
          </Link>
          <Link href="/safety" className="hover:text-beam-cream">
            Safety
          </Link>
          <Link href="/auth?mode=signin" className="hover:text-beam-cream">
            Sign in
          </Link>
          <Link href="/auth?mode=signup" className="hover:text-beam-cream">
            Create account
          </Link>
        </nav>
      </div>
    </footer>
  )
}
