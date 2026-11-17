import type { Metadata } from 'next'
import { LegalDocumentView } from '@/components/legal/LegalDocumentView'
import { loadLegalDocument } from '@/lib/legal/loadLegalDocument'
import { pageMetadata } from '@/lib/seo/site'
import { PolicyPlaceholder } from '@/screens/PolicyPlaceholder'

export const metadata: Metadata = pageMetadata({
  title: 'Privacy Policy',
  description:
    'How Bunk collects, uses, and protects personal information when you post tasks, send offers, or create an account.',
  path: '/privacy',
})

export default function PrivacyPage() {
  const doc = loadLegalDocument('privacy')
  return (
    <PolicyPlaceholder title="Privacy Policy" testId="privacy-page">
      <LegalDocumentView doc={doc} />
    </PolicyPlaceholder>
  )
}
