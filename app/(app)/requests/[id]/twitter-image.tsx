import { ImageResponse } from 'next/og'
import {
  DEFAULT_OG_ALT,
  DefaultOgCard,
  JobOgCard,
  loadOgPhotoDataUrl,
  loadOutfitFonts,
  OG_SIZE,
  outfitFontOptions,
} from '@/lib/seo/ogBrand'
import {
  lookupDemoRequestForOg,
  lookupPublicRequest,
} from '@/lib/seo/publicEntities'

export const alt = DEFAULT_OG_ALT
export const size = OG_SIZE
export const contentType = 'image/png'

type Props = { params: Promise<{ id: string }> }

export default async function Image({ params }: Props) {
  const { id } = await params
  const [fonts, photoSrc] = await Promise.all([loadOutfitFonts(), loadOgPhotoDataUrl()])
  const fontOpts = outfitFontOptions(fonts)

  const live = await lookupPublicRequest(id)
  const job =
    live.status === 'found' ? live.data : lookupDemoRequestForOg(id)

  if (!job) {
    return new ImageResponse(<DefaultOgCard photoSrc={photoSrc} />, {
      ...size,
      fonts: fontOpts,
    })
  }

  return new ImageResponse(
    (
      <JobOgCard
        photoSrc={photoSrc}
        job={{
          title: job.title,
          categoryLabel: job.categoryLabel,
          areaLabel: job.areaLabel,
          priceLabel: job.priceLabel,
        }}
      />
    ),
    {
      ...size,
      fonts: fontOpts,
    },
  )
}
