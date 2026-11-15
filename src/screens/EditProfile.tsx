'use client'

import { EditProfileForm } from '@/components/account/EditProfileForm'
import { SettingsPageChrome } from '@/components/account/SettingsNav'

export function EditProfile() {
  return (
    <SettingsPageChrome
      title="Edit profile"
      active="edit-profile"
      previewHref="/you"
      mobileBackHref="/you"
      mobileBackLabel="Back to your profile"
    >
      <EditProfileForm />
    </SettingsPageChrome>
  )
}
