'use client'

import Link from 'next/link'
import { useMemo, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { BeamWordmark } from '@/components/BeamMark'
import { useBeam } from '@/context/BeamContext'
import { AuthExperience } from '@/components/auth/AuthExperience'
import { sanitizeNext } from '@/lib/auth/safeNext'

/** Routes that stay readable while logged out. */
const PUBLIC_APP_PREFIXES = ['/browse', '/safety', '/people/', '/requests/']

function isPublicAppPath(pathname: string) {
  return PUBLIC_APP_PREFIXES.some(
    (p) => pathname === p.replace(/\/$/, '') || pathname.startsWith(p),
  )
}

/**
 * Live-mode gate. Public discovery routes pass through; write routes prompt
 * for sign-in with a minimal top header so they are never a dead end.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { mode, authUser } = useBeam()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const nextPath = useMemo(() => {
    const q = searchParams?.toString()
    return sanitizeNext(q ? `${pathname}?${q}` : pathname)
  }, [pathname, searchParams])

  if (mode !== 'live' || authUser) return <>{children}</>
  if (isPublicAppPath(pathname)) return <>{children}</>

  return (
    <div className="min-h-dvh bg-[#F4F8FD]">
      <header className="border-b border-[rgba(7,19,48,0.08)] bg-white">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-6">
          <Link href="/">
            <BeamWordmark markWidth={24} markHeight={24} wordClassName="text-[22px]" tone="ink" />
          </Link>
          <nav className="flex items-center gap-6 text-[14.5px] font-medium text-[#64748B]">
            <Link href="/browse" className="hover:text-[#071330]">
              Browse
            </Link>
            <Link href="/safety" className="hover:text-[#071330]">
              Safety
            </Link>
          </nav>
        </div>
      </header>
      <AuthExperience initialMode="signin" nextPath={nextPath} compact />
    </div>
  )
}
