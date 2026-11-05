import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="px-4 py-16 text-center">
      <h1 className="type-h2 text-beam-cream">Page not found</h1>
      <p className="mt-2 type-sec text-beam-muted">That route is not part of Beam.</p>
      <Link
        href="/"
        className="btn-compact mt-6 inline-flex items-center rounded-[8px] bg-beam-amber px-4 text-[13px] font-semibold text-beam-charcoal"
      >
        Back home
      </Link>
    </div>
  )
}
