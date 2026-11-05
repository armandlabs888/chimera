import { Compass, Home, PlusCircle, Shield, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/browse', label: 'Browse', icon: Compass },
  { to: '/post', label: 'Post', icon: PlusCircle },
  { to: '/you', label: 'You', icon: UserRound },
  { to: '/safety', label: 'Safety', icon: Shield },
]

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-beam-line/80 bg-beam-base/95 backdrop-blur-md md:hidden"
      aria-label="Primary"
    >
      <ul className="safe-bottom mx-auto grid max-w-lg grid-cols-5 px-1 pt-1">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition ${
                  isActive ? 'text-beam-amber' : 'text-beam-muted hover:text-beam-cream'
                }`
              }
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
