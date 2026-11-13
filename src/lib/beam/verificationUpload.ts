/**
 * Legacy utility-bill upload helpers.
 * Location verification replaced document upload; kept as a no-op module so
 * old imports do not break during transition. Do not use for new flows.
 */

export function validateVerificationDocument(_file: File): string | null {
  return 'Utility bill upload is no longer used. Confirm you are home instead.'
}

export async function uploadVerificationDocument(_input: {
  mode: 'live' | 'demo'
  supabase: unknown
  userId: string
  file: File
}): Promise<never> {
  throw new Error('Utility bill upload is no longer used. Confirm you are home instead.')
}

export async function createVerificationDocumentUrl(_input: {
  mode: 'live' | 'demo'
  supabase: unknown
  path: string
  previewUrl?: string | null
}): Promise<string | null> {
  return null
}
