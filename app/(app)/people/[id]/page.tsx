import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HelperProfile } from '@/screens/HelperProfile'
import { lookupPublicHelper } from '@/lib/seo/publicEntities'
import { pageMetadata } from '@/lib/seo/site'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const result = await lookupPublicHelper(id)

  if (result.status === 'missing') notFound()

  if (result.status === 'found') {
    const { name, categoryLabel, cityLabel, kind } = result.data
    if (kind === 'neighbor') {
      return pageMetadata({
        title: name,
        description: `${name} on Bunk.`,
        path: `/people/${id}`,
        noindex: true,
      })
    }
    const title = `${name}`
    const description = `${name} offers ${categoryLabel} on Bunk in ${cityLabel}. Compare offers and book trusted local help.`
    return pageMetadata({
      title,
      description,
      path: `/people/${id}`,
    })
  }

  return {
    ...pageMetadata({
      title: 'Helper profile',
      description: 'View a Bunk helper profile for local home, auto, junk removal, and pet care help.',
      path: `/people/${id}`,
      noindex: true,
    }),
  }
}

export default async function PersonPage({ params }: Props) {
  const { id } = await params
  const result = await lookupPublicHelper(id)
  if (result.status === 'missing') notFound()
  return <HelperProfile />
}
