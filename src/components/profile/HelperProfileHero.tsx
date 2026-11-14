'use client'

import { Settings } from 'lucide-react'
import Link from 'next/link'

/**
 * Settings control kept for account overflow / legacy callers.
 * Own-profile and public helper heroes now share ProfileHeader.
 */
export function HelperProfileSettingsButton({ href = '/settings' }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="Settings"
      data-testid="you-hero-settings"
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[rgba(7,19,48,0.1)] bg-white text-[#4A5568] transition hover:text-[#1D5CE5]"
    >
      <Settings className="h-5 w-5" strokeWidth={1.75} aria-hidden />
    </Link>
  )
}
