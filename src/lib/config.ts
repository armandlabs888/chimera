export type BeamMode = 'live' | 'demo' | 'unconfigured'

export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || undefined
}

export function getSupabasePublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    undefined
  )
}

export function isExplicitDemoMode(): boolean {
  if (process.env.NEXT_PUBLIC_BEAM_DEMO_MODE === '1') return true
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    if (params.get('demo') === '1') return true
  }
  return false
}

export function resolveBeamMode(): BeamMode {
  if (isExplicitDemoMode()) return 'demo'
  const url = getSupabaseUrl()
  const key = getSupabasePublishableKey()
  if (url && key) return 'live'
  return 'unconfigured'
}

export function assertLiveConfig(): { url: string; key: string } {
  const url = getSupabaseUrl()
  const key = getSupabasePublishableKey()
  if (!url || !key) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or enable demo mode with NEXT_PUBLIC_BEAM_DEMO_MODE=1.',
    )
  }
  return { url, key }
}
