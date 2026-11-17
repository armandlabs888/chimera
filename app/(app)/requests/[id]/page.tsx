import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RequestDetail } from '@/screens/RequestDetail'
import {
  lookupDemoRequestForOg,
  lookupPublicRequest,
} from '@/lib/seo/publicEntities'
import { pageMetadata } from '@/lib/seo/site'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const result = await lookupPublicRequest(id)

  if (result.status === 'missing') notFound()

  // Named, indexable metadata only for publicly listed open jobs.
  if (result.status === 'found') {
    const { title, areaLabel, categoryLabel, priceLabel } = result.data
    const bits = [categoryLabel, areaLabel, priceLabel].filter(Boolean).join(' · ')
    return pageMetadata({
      title,
      description: `${title} on Bunk. ${bits}. Compare offers from verified neighbors nearby.`,
      path: `/requests/${id}`,
    })
  }

  // Demo seed jobs: useful titles for local OG/metadata without indexing as live.
  const demo = lookupDemoRequestForOg(id)
  if (demo) {
    const bits = [demo.categoryLabel, demo.areaLabel, demo.priceLabel]
      .filter(Boolean)
      .join(' · ')
    return {
      ...pageMetadata({
        title: demo.title,
        description: `${demo.title} on Bunk. ${bits}.`,
        path: `/requests/${id}`,
        noindex: true,
      }),
    }
  }

  // `private` (exists, not public) and `unknown` share generic noindex metadata.
  return {
    ...pageMetadata({
      title: 'Request',
      description: 'View a Bunk job request and offers from local helpers.',
      path: `/requests/${id}`,
      noindex: true,
    }),
  }
}

export default async function RequestDetailPage({ params }: Props) {
  const { id } = await params
  const result = await lookupPublicRequest(id)
  if (result.status === 'missing') notFound()
  return <RequestDetail />
}
