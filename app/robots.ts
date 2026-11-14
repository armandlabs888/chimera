import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/home',
        '/you',
        '/messages',
        '/settings',
        '/post',
        '/verify',
        '/admin',
        '/onboarding',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
