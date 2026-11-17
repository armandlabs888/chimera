import { ImageResponse } from 'next/og'
import {
  DEFAULT_OG_ALT,
  DefaultOgCard,
  loadOgPhotoDataUrl,
  loadOutfitFonts,
  OG_SIZE,
  outfitFontOptions,
} from '@/lib/seo/ogBrand'

export const alt = DEFAULT_OG_ALT
export const size = OG_SIZE
export const contentType = 'image/png'

export default async function Image() {
  const [fonts, photoSrc] = await Promise.all([loadOutfitFonts(), loadOgPhotoDataUrl()])
  return new ImageResponse(<DefaultOgCard photoSrc={photoSrc} />, {
    ...size,
    fonts: outfitFontOptions(fonts),
  })
}
