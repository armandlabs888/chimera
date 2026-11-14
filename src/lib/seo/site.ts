import type { Metadata } from 'next'

/** Production origin for canonicals, sitemap, and robots. */
export const SITE_URL = 'https://www.yariapp.com'

export const SITE_NAME = 'HouseCall'

export const DEFAULT_DESCRIPTION =
  'Describe the job, compare priced offers, and choose local help that fits: home, auto, junk removal, pets, and other everyday tasks.'

const NOINDEX: Metadata['robots'] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
}

type PageMetaInput = {
  title: string
  description: string
  path: string
  /** Protected / auth-only routes should not be indexed. */
  noindex?: boolean
}

/** Shared per-page metadata: title template, description, canonical, optional noindex. */
export function pageMetadata({
  title,
  description,
  path,
  noindex = false,
}: PageMetaInput): Metadata {
  const canonical = path.startsWith('http') ? path : `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
    },
    ...(noindex ? { robots: NOINDEX } : {}),
  }
}
