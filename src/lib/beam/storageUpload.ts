import type { SupabaseClient } from '@supabase/supabase-js'

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

  const mime = file.type.includes('webp') ? 'image/webp' : 'image/jpeg'
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Compress failed'))),
      mime,
      quality,
    )
  })
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Read failed'))
    reader.readAsDataURL(blob)
  })
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 40)
  return { blob, dataUrl, name: `${base || 'photo'}.jpg` }
}

export async function uploadBeamMedia(opts: {
  mode: 'live' | 'demo' | 'unconfigured'
  supabase?: SupabaseClient | null
  userId: string
  file: File
}): Promise<string> {
  const compressed = await compressImageFile(opts.file)
  if (opts.mode !== 'live' || !opts.supabase) {
    return compressed.dataUrl
  }

  try {
    const path = `${opts.userId}/${Date.now()}-${compressed.name}`
    const { error } = await opts.supabase.storage
      .from('beam-media')
      .upload(path, compressed.blob, {
        contentType: compressed.blob.type || 'image/jpeg',
        upsert: false,
      })
    if (error) throw error
    const { data } = opts.supabase.storage.from('beam-media').getPublicUrl(path)
    return data.publicUrl || compressed.dataUrl
  } catch {
    return compressed.dataUrl
  }
}
