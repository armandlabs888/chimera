import type { Metadata } from 'next'
import { LegalDocumentView } from '@/components/legal/LegalDocumentView'
import { loadLegalDocument } from '@/lib/legal/loadLegalDocument'
import { pageMetadata } from '@/lib/seo/site'
import { PolicyPlaceholder } from '@/screens/PolicyPlaceholder'

export const metadata: Metadata = pageMetadata({
  title: 'Terms of Service',
  description: 'HouseCall terms of service for neighbors and helpers.',
  path: '/terms',
})

export default function TermsPage() {
  const doc = loadLegalDocument('terms')
  return (
    <PolicyPlaceholder title="Terms of Service" testId="terms-page">
      <LegalDocumentView doc={doc} />
    </PolicyPlaceholder>
  )
}
