import type { BrowseRadiusId } from '@/lib/browseDistance'
import { radiusMilesValue } from '@/lib/browseDistance'
import { createClient } from '@/lib/supabase/client'

export type BrowseDistanceRow = {
  entity_type: string
  entity_id: string
  distance_miles: number | null
}

/**
 * Live-mode distances via SECURITY DEFINER RPC.
 * Passes viewer origin explicitly (ZIP / local pin / resolved home).
 * Does not persist origin. Falls back to null on error so UI can use local Haversine.
 */
export async function fetchBrowseMarketplaceDistances(input: {
  originLat: number
  originLng: number
  radius: BrowseRadiusId
}): Promise<{
  requestMiles: Map<string, number | null>
  profileMiles: Map<string, number | null>
} | null> {
  try {
    const client = createClient()
    const { data, error } = await client.rpc('browse_marketplace_distances', {
      p_origin_lat: input.originLat,
      p_origin_lng: input.originLng,
      p_radius_miles: radiusMilesValue(input.radius),
    })
    if (error || !Array.isArray(data)) return null
    const requestMiles = new Map<string, number | null>()
    const profileMiles = new Map<string, number | null>()
    for (const row of data as BrowseDistanceRow[]) {
      const id = String(row.entity_id)
      const miles =
        row.distance_miles == null || !Number.isFinite(Number(row.distance_miles))
          ? null
          : Number(row.distance_miles)
      if (row.entity_type === 'request') requestMiles.set(id, miles)
      else if (row.entity_type === 'profile') profileMiles.set(id, miles)
    }
    return { requestMiles, profileMiles }
  } catch {
    return null
  }
}
