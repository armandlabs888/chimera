import type { SupabaseClient } from '@supabase/supabase-js'
import {
  LISTING_PHOTO_MAX_BYTES,
  isAllowedListingPhotoMime,
  validateListingPhotoFile,
} from '@/lib/listingPhotos'

export async function compressImageFile(
  file: File,
  maxDim = 1200,
  quality = 0.84,
): Promise<{ blob: Blob; dataUrl: string; name: string }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const mime = file.type.includes('webp')
    ? 'image/webp'
    : file.type.includes('png')
      ? 'image/png'
      : 'image/jpeg'
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Compress failed'))),
      mime,
      quality,
    )
  })
  if (blob.size > LISTING_PHOTO_MAX_BYTES) {
    throw new Error('Compressed photo still exceeds 5 MB. Try a smaller image.')
  }
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Read failed'))
    reader.readAsDataURL(blob)
  })
  const base = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
  return { blob, dataUrl, name: `${base || 'photo'}.${ext}` }
}

function objectPathFromPublicUrl(url: string, userId: string): string | null {
  try {
    const u = new URL(url)
    const marker = '/storage/v1/object/public/beam-media/'
    const idx = u.pathname.indexOf(marker)
    if (idx < 0) return null
    const path = decodeURIComponent(u.pathname.slice(idx + marker.length))
    if (!path.startsWith(`${userId}/`)) return null
    return path
  } catch {
    return null
  }
}

export async function uploadBeamMedia(opts: {
  mode: 'live' | 'demo' | 'unconfigured'
  supabase?: SupabaseClient | null
  userId: string
  file: File
  /** Current listing photo count before this upload (for max-5). */
  currentCount?: number
}): Promise<string> {
  const count = opts.currentCount ?? 0
  const validated = validateListingPhotoFile(opts.file, count)
  if (!validated.ok) throw new Error(validated.error)
  if (!isAllowedListingPhotoMime(opts.file.type)) {
    throw new Error('Use JPEG, PNG, WebP, or GIF.')
  }

  const compressed = await compressImageFile(opts.file)
  if (opts.mode !== 'live' || !opts.supabase) {
    return compressed.dataUrl
  }

  const path = `${opts.userId}/listings/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${compressed.name}`
  const { error } = await opts.supabase.storage.from('beam-media').upload(path, compressed.blob, {
    contentType: compressed.blob.type || 'image/jpeg',
    upsert: false,
  })
  if (error) throw new Error(error.message || 'Upload failed. Try again.')
  const { data } = opts.supabase.storage.from('beam-media').getPublicUrl(path)
  if (!data.publicUrl) throw new Error('Upload succeeded but no public URL was returned.')
  return data.publicUrl
}

/** Best-effort delete of an owned beam-media object. Ignores demo data URLs. */
export async function deleteBeamMedia(opts: {
  mode: 'live' | 'demo' | 'unconfigured'
  supabase?: SupabaseClient | null
  userId: string
  url: string
}): Promise<void> {
  if (opts.mode !== 'live' || !opts.supabase) return
  if (opts.url.startsWith('data:')) return
  const path = objectPathFromPublicUrl(opts.url, opts.userId)
  if (!path) return
  await opts.supabase.storage.from('beam-media').remove([path])
}
