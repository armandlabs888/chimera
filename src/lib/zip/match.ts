import { haversineMiles } from '@/lib/location'
import {
  URGENT_ESCALATION_RADIUS_MILES,
  URGENT_MATCH_RADIUS_MILES,
} from '@/lib/urgent/constants'

export {
  URGENT_MATCH_RADIUS_MILES as URGENT_ZIP_MATCH_RADIUS_MILES,
  URGENT_ESCALATION_RADIUS_MILES as URGENT_ZIP_ESCALATION_RADIUS_MILES,
}

export type UrgentMatchJob = {
  zip?: string | null
  lat?: number | null
  lng?: number | null
  requesterId?: string | null
  category?: string | null
}

export type UrgentMatchHelper = {
  id: string
  zip?: string | null
  addressLat?: number | null
  addressLng?: number | null
  skills?: string[] | null
  availableNow?: boolean
  isHelper?: boolean
  smsOptIn?: boolean
  phoneConfirmed?: boolean
  phoneE164?: string | null
}

function zip5(raw: string | null | undefined): string | null {
  const digits = String(raw ?? '')
    .trim()
    .replace(/\s+/g, '')
  const m = digits.match(/^(\d{5})/)
  return m ? m[1] : null
}

/**
 * Pure matching rule mirrored by private.match_urgent_job_helpers:
 * same verified home ZIP as the job, OR home point within radius of the job ZIP center.
 * Other gates (opt-in, skills, quiet hours, daily cap) are applied by SQL.
 */
export function helperMatchesUrgentJob(
  job: UrgentMatchJob,
  helper: UrgentMatchHelper,
  radiusMiles: number,
): { matches: boolean; distanceMiles: number | null } {
  if (!(radiusMiles > 0)) return { matches: false, distanceMiles: null }

  const jobZip = zip5(job.zip)
  const helperZip = zip5(helper.zip)
  const sameZip = Boolean(jobZip && helperZip && jobZip === helperZip)

  const hasJobPoint =
    typeof job.lat === 'number' &&
    typeof job.lng === 'number' &&
    Number.isFinite(job.lat) &&
    Number.isFinite(job.lng)
  const hasHelperPoint =
    typeof helper.addressLat === 'number' &&
    typeof helper.addressLng === 'number' &&
    Number.isFinite(helper.addressLat) &&
    Number.isFinite(helper.addressLng)

  let distanceMiles: number | null = null
  if (hasJobPoint && hasHelperPoint) {
    distanceMiles = haversineMiles(
      job.lat as number,
      job.lng as number,
      helper.addressLat as number,
      helper.addressLng as number,
    )
  } else if (sameZip) {
    distanceMiles = 0
  }

  const withinRadius =
    distanceMiles != null && hasHelperPoint && distanceMiles <= radiusMiles

  if (!sameZip && !withinRadius) {
    return { matches: false, distanceMiles }
  }
  if (!sameZip && !hasJobPoint) {
    return { matches: false, distanceMiles }
  }

  return { matches: true, distanceMiles }
}
