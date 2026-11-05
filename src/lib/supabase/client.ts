'use client'

import { createBrowserClient } from '@supabase/ssr'
import { assertLiveConfig } from '@/lib/config'

export function createClient() {
  const { url, key } = assertLiveConfig()
  return createBrowserClient(url, key)
}
