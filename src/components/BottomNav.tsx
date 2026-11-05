'use client'

import { Compass, Home, PlusCircle, Shield, UserRound } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', label: 'Home', icon: Home, end: true },
  { href: '/browse', label: 'Browse', icon: Compass },
  { href: '/post', label: 'Post', icon: PlusCircle },
  { href: '/you', label: 'You', icon: UserRound },
  { href: '/safety', label: 'Safety', icon: Shield },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-beam-line bg-beam-base/95 backdrop-blur-sm md:hidden"
      aria-label="Primary"
    >
      <ul className="safe-bottom mx-auto grid max-w-lg grid-cols-5 px-1 pt-1">
        {tabs.map(({ href, label, icon: Icon, end }) => {
          const isActive = end ? pathname === href : pathname.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[8px] text-[11px] font-medium transition ${
                  isActive ? 'text-beam-amber-deep' : 'text-beam-muted hover:text-beam-cream'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
