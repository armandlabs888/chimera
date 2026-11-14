import type { MetadataRoute } from 'next'
import { listPublicHelperIdsForSitemap } from '@/lib/seo/publicEntities'
import { SITE_URL } from '@/lib/seo/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/browse`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/safety`, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const helperIds = await listPublicHelperIdsForSitemap()
  const helperRoutes: MetadataRoute.Sitemap = helperIds.map((id) => ({
    url: `${SITE_URL}/people/${id}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...staticRoutes, ...helperRoutes]
}
