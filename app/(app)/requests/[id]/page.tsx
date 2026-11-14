import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RequestDetail } from '@/screens/RequestDetail'
import { lookupPublicRequest } from '@/lib/seo/publicEntities'
import { pageMetadata } from '@/lib/seo/site'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const result = await lookupPublicRequest(id)

  if (result.status === 'found') {
    const { title, areaLabel } = result.data
    return pageMetadata({
      title,
      description: `${title} near ${areaLabel} on HouseCall. Compare priced offers from local helpers.`,
      path: `/requests/${id}`,
    })
  }

  return {
    ...pageMetadata({
      title: 'Request',
      description: 'View a HouseCall job request and offers from local helpers.',
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
