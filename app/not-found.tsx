import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="px-4 py-16 text-center">
      <h1 className="font-display text-3xl text-beam-cream">Page not found</h1>
      <p className="mt-2 text-sm text-beam-muted">That route is not part of the Beam demo.</p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-xl bg-beam-amber px-4 py-3 text-sm font-semibold text-beam-base"
      >
        Back home
      </Link>
    </div>
  )
}
