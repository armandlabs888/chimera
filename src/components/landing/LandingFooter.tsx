import Link from 'next/link'

export function LandingFooter() {
  return (
    <footer className="bg-beam-charcoal px-4 py-10 text-white sm:px-6">
      <div className="mx-auto flex max-w-[72rem] flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[17px] font-semibold tracking-tight">Beam</p>
          <p className="mt-1 type-sec text-white/65">Help nearby. Done today. · Austin</p>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 type-sec text-white/75" aria-label="Footer">
          <a href="#how-it-works" className="hover:text-white">
            How it works
          </a>
          <a href="#categories" className="hover:text-white">
            Categories
          </a>
          <Link href="/browse" className="hover:text-white">
            Browse
          </Link>
          <Link href="/post" className="hover:text-white">
            Post
          </Link>
          <Link href="/safety" className="hover:text-white">
            Safety
          </Link>
          <Link href="/you" className="hover:text-white">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  )
}
