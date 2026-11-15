import type { Metadata } from 'next'
import { LegalDocumentView } from '@/components/legal/LegalDocumentView'
import { loadLegalDocument } from '@/lib/legal/loadLegalDocument'
import { pageMetadata } from '@/lib/seo/site'
import { PolicyPlaceholder } from '@/screens/PolicyPlaceholder'

export const metadata: Metadata = pageMetadata({
  title: 'Privacy Policy',
  description: 'How HouseCall collects, uses, and protects your information.',
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
