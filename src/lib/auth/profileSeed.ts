import type { User } from '@supabase/supabase-js'
import type { NeighborhoodId } from '@/types'
import { NEIGHBORHOODS } from '@/data/neighborhoods'

const NEIGHBORHOOD_IDS = new Set(NEIGHBORHOODS.map((n) => n.id))

export function sanitizeNeighborhood(raw: string | null | undefined): NeighborhoodId {
  const value = (raw ?? '').trim().toLowerCase()
  if (NEIGHBORHOOD_IDS.has(value as NeighborhoodId)) return value as NeighborhoodId
  return 'east-austin'
}

export type ProfileSeed = {
  name: string
  avatarUrl: string
  neighborhood: NeighborhoodId
}

/** Build profile seed from auth user metadata (Google + email signup). */
export function profileSeedFromUser(
  user: User,
  overrides?: { name?: string; neighborhood?: string },
): ProfileSeed {
  const md = (user.user_metadata ?? {}) as Record<string, unknown>
  const metaName =
    (typeof md.name === 'string' && md.name.trim()) ||
    (typeof md.full_name === 'string' && md.full_name.trim()) ||
    ''
  const name = (overrides?.name?.trim() || metaName || user.email?.split('@')[0] || 'Neighbor').slice(
    0,
    80,
  )
  const avatarUrl =
    (typeof md.avatar_url === 'string' && md.avatar_url.trim()) ||
    (typeof md.picture === 'string' && md.picture.trim()) ||
    ''
  const neighborhood = sanitizeNeighborhood(
    overrides?.neighborhood || (typeof md.neighborhood === 'string' ? md.neighborhood : undefined),
  )
  return { name, avatarUrl, neighborhood }
}
