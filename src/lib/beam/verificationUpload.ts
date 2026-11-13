import type { SupabaseClient } from '@supabase/supabase-js'
import { VERIFY_ALLOWED_MIME, VERIFY_MAX_BYTES } from '@/lib/verification/constants'

export function validateVerificationDocument(file: File): { ok: true } | { ok: false; error: string } {
  if (!file || !(file instanceof File)) {
    return { ok: false, error: 'Choose an electricity or water bill to upload.' }
  }
  if (file.size <= 0) {
    return { ok: false, error: 'That file looks empty. Choose another bill.' }
  }
  if (file.size > VERIFY_MAX_BYTES) {
    return { ok: false, error: 'File is too large. Use a PDF or photo up to 10 MB.' }
  }
  const mime = (file.type || '').toLowerCase()
  const allowed = VERIFY_ALLOWED_MIME as readonly string[]
  if (mime && !allowed.includes(mime)) {
    return { ok: false, error: 'Use a PDF or a clear photo (JPEG, PNG, or WebP).' }
  }
  // Some browsers omit MIME for HEIC/PDF; allow by extension as a soft fallback.
  if (!mime) {
    const lower = file.name.toLowerCase()
    if (
      !lower.endsWith('.pdf') &&
      !lower.endsWith('.jpg') &&
      !lower.endsWith('.jpeg') &&
      !lower.endsWith('.png') &&
      !lower.endsWith('.webp') &&
      !lower.endsWith('.heic') &&
      !lower.endsWith('.heif')
    ) {
      return { ok: false, error: 'Use a PDF or a clear photo (JPEG, PNG, or WebP).' }
    }
  }
  return { ok: true }
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\]/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'bill'
}

export type VerificationUploadResult = {
  path: string
  name: string
  mime: string | null
  bytes: number
  /** Demo-only preview (data URL). */
  previewUrl?: string
}

/** Upload a utility bill to the private helper-verification bucket (or demo data URL). */
export async function uploadVerificationDocument(opts: {
  mode: 'live' | 'demo' | 'unconfigured'
  supabase?: SupabaseClient | null
  userId: string
  file: File
}): Promise<VerificationUploadResult> {
  const validated = validateVerificationDocument(opts.file)
  if (!validated.ok) throw new Error(validated.error)

  const name = sanitizeFileName(opts.file.name)
  const mime = opts.file.type || null
  const bytes = opts.file.size

  if (opts.mode !== 'live' || !opts.supabase) {
    const previewUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Could not read that file.'))
      reader.readAsDataURL(opts.file)
    })
    return {
      path: `${opts.userId}/bills/demo-${Date.now()}-${name}`,
      name,
      mime,
      bytes,
      previewUrl,
    }
  }

  const path = `${opts.userId}/bills/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${name}`
  const { error } = await opts.supabase.storage.from('helper-verification').upload(path, opts.file, {
    contentType: mime || undefined,
    upsert: false,
  })
  if (error) throw new Error(error.message || 'Upload failed. Try again.')
  return { path, name, mime, bytes }
}

export async function createVerificationDocumentUrl(opts: {
  mode: 'live' | 'demo' | 'unconfigured'
  supabase?: SupabaseClient | null
  path: string
  previewUrl?: string | null
}): Promise<string | null> {
  if (opts.previewUrl) return opts.previewUrl
  if (opts.mode !== 'live' || !opts.supabase || !opts.path) return null
  const { data, error } = await opts.supabase.storage
    .from('helper-verification')
    .createSignedUrl(opts.path, 60 * 10)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
