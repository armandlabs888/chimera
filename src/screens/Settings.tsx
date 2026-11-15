'use client'

import '@/components/account/settings-nav.css'
import { SettingsAccount } from '@/screens/SettingsAccount'
import { YouSettingsMenu } from '@/screens/YouSettingsMenu'

/**
 * /settings
 * - Mobile: account hub list (settings-menu mock), You tab destination
 * - Desktop: full settings page with left nav (same as /settings/account)
 */
export function Settings() {
  return (
    <>
      <div className="settings-root-mobile">
        <YouSettingsMenu />
      </div>
      <div className="settings-root-desktop">
        <SettingsAccount />
      </div>
    </>
  )
}
