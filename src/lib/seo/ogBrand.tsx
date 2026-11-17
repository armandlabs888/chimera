import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ReactElement } from 'react'

export const OG_SIZE = { width: 1200, height: 630 } as const

export const OG_COLORS = {
  navy: '#071330',
  muted: '#4A5568',
  blue: '#1D5CE5',
  wash: '#F7F9FC',
  line: '#E3E8EF',
  white: '#FFFFFF',
} as const

export const DEFAULT_OG_ALT =
  'BlockSide. Trusted help, right next door. Post a task and get offers from verified neighbors nearby.'

type OutfitFonts = {
  medium: ArrayBuffer
  bold: ArrayBuffer
}

let fontCache: OutfitFonts | null = null
let photoCache: string | null = null

export async function loadOutfitFonts(): Promise<OutfitFonts> {
  if (fontCache) return fontCache
  const dir = join(process.cwd(), 'assets/fonts')
  const [medium, bold] = await Promise.all([
    readFile(join(dir, 'Outfit-Medium.ttf')),
    readFile(join(dir, 'Outfit-Bold.ttf')),
  ])
  fontCache = {
    medium: medium.buffer.slice(medium.byteOffset, medium.byteOffset + medium.byteLength),
    bold: bold.buffer.slice(bold.byteOffset, bold.byteOffset + bold.byteLength),
  }
  return fontCache
}

export async function loadOgPhotoDataUrl(): Promise<string> {
  if (photoCache) return photoCache
  const bytes = await readFile(join(process.cwd(), 'public/images/og-card-photo.jpg'))
  photoCache = `data:image/jpeg;base64,${bytes.toString('base64')}`
  return photoCache
}

export function outfitFontOptions(fonts: OutfitFonts) {
  return [
    { name: 'Outfit', data: fonts.medium, style: 'normal' as const, weight: 500 as const },
    { name: 'Outfit', data: fonts.bold, style: 'normal' as const, weight: 700 as const },
  ]
}

function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        fontFamily: 'Outfit',
        fontSize: size,
        fontWeight: 700,
        color: OG_COLORS.blue,
        letterSpacing: '-0.04em',
        lineHeight: 1,
      }}
    >
      BlockSide
    </div>
  )
}

function PhotoPanel({ src }: { src: string }) {
  return (
    <div
      style={{
        display: 'flex',
        width: 480,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <img
        src={src}
        width={480}
        height={630}
        alt=""
        style={{
          width: 480,
          height: 630,
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 48,
          background: `linear-gradient(90deg, ${OG_COLORS.wash} 0%, rgba(247,249,252,0) 100%)`,
        }}
      />
    </div>
  )
}

function Shell({
  photoSrc,
  children,
}: {
  photoSrc: string
  children: ReactElement | ReactElement[]
}) {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: OG_COLORS.wash,
        fontFamily: 'Outfit',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1,
          padding: '64px 56px 56px 64px',
          borderRight: `1px solid ${OG_COLORS.line}`,
        }}
      >
        {children}
      </div>
      <PhotoPanel src={photoSrc} />
    </div>
  )
}

/** Default social share card for the site. */
export function DefaultOgCard({ photoSrc }: { photoSrc: string }): ReactElement {
  return (
    <Shell photoSrc={photoSrc}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <BrandMark />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            maxWidth: 560,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 52,
              fontWeight: 700,
              color: OG_COLORS.navy,
              letterSpacing: '-0.03em',
              lineHeight: 1.12,
            }}
          >
            Trusted help, right next door.
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 26,
              fontWeight: 500,
              color: OG_COLORS.muted,
              lineHeight: 1.35,
              maxWidth: 520,
            }}
          >
            Post a task. Nearby verified neighbors offer to help.
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 22,
          fontWeight: 500,
          color: OG_COLORS.muted,
          letterSpacing: '0.01em',
        }}
      >
        joinbunk.xyz
      </div>
    </Shell>
  )
}

export type JobOgFields = {
  title: string
  categoryLabel: string
  areaLabel: string
  priceLabel: string
}

/** Per-job social share card (public fields only). */
export function JobOgCard({
  photoSrc,
  job,
}: {
  photoSrc: string
  job: JobOgFields
}): ReactElement {
  const meta = [job.categoryLabel, job.areaLabel].filter(Boolean).join(' · ')
  return (
    <Shell photoSrc={photoSrc}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <BrandMark size={44} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 580 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 46,
              fontWeight: 700,
              color: OG_COLORS.navy,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
            }}
          >
            {job.title}
          </div>
          {meta ? (
            <div
              style={{
                display: 'flex',
                fontSize: 24,
                fontWeight: 500,
                color: OG_COLORS.muted,
                lineHeight: 1.3,
              }}
            >
              {meta}
            </div>
          ) : null}
          <div
            style={{
              display: 'flex',
              fontSize: 36,
              fontWeight: 700,
              color: OG_COLORS.blue,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {job.priceLabel}
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 22,
          fontWeight: 500,
          color: OG_COLORS.muted,
          letterSpacing: '0.01em',
        }}
      >
        joinbunk.xyz
      </div>
    </Shell>
  )
}
