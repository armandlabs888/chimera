import { Zap } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'

const desktopLinks = [
  { to: '/', label: 'Home' },
  { to: '/browse', label: 'Browse' },
  { to: '/post', label: 'Post request' },
  { to: '/you', label: 'You' },
  { to: '/safety', label: 'Safety' },
]

export function Layout() {
  const location = useLocation()
  const hideChrome = location.pathname.startsWith('/messages/')

  return (
    <div className="min-h-dvh bg-beam-base text-beam-cream">
      <div className="pointer-events-none fixed inset-0 grain opacity-40" aria-hidden />
      {!hideChrome ? (
        <header className="sticky top-0 z-30 border-b border-beam-line/60 bg-beam-base/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link to="/" className="flex items-center gap-2 touch-target">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-beam-amber/15 text-beam-amber">
                <Zap className="h-5 w-5" fill="currentColor" />
              </span>
              <span className="font-display text-xl font-semibold tracking-tight">Beam</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex" aria-label="Desktop">
              {desktopLinks.map((link) => {
                const active =
                  link.to === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(link.to)
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                      active ? 'bg-beam-amber-soft text-beam-amber' : 'text-beam-muted hover:text-beam-cream'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </header>
      ) : null}

      <main className={`relative mx-auto w-full max-w-6xl ${hideChrome ? '' : 'pb-24 md:pb-10'}`}>
        <Outlet />
      </main>

      {!hideChrome ? <BottomNav /> : null}
    </div>
  )
}
