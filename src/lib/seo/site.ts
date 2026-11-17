import type { Metadata } from 'next'

/** Production origin for canonicals, sitemap, and robots. */
export const SITE_URL = 'https://www.joinbunk.xyz'

export const SITE_NAME = 'Bunk'

export const DEFAULT_TITLE = 'Bunk | Trusted help, right next door'

export const DEFAULT_DESCRIPTION =
  'Post a local task on Bunk and get offers from verified neighbors nearby. Home, auto, junk removal, pets, and everyday help right next door.'

/** Static PNG fallback for crawlers; also generated live at /opengraph-image. */
export const DEFAULT_OG_IMAGE = {
  url: '/images/og-default.png',
  width: 1200,
  height: 630,
  alt: 'Bunk. Trusted help, right next door. Post a task and get offers from verified neighbors nearby.',
}

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
  const canonical = path.startsWith('http')
    ? path
    : `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
  const ogTitle = `${title} | ${SITE_NAME}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: ogTitle,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: 'en_US',
      type: 'website',
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: [DEFAULT_OG_IMAGE.url],
    },
    ...(noindex ? { robots: NOINDEX } : {}),
  }
}
