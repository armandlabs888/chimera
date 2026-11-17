import type { Metadata } from 'next'
import { EditProfile } from '@/screens/EditProfile'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Edit profile',
  description: 'Edit your BlockSide profile and helper details.',
  path: '/settings/profile',
  noindex: true,
})

export default function EditProfilePage() {
  return <EditProfile />
}
