import type { Person } from '@/types'

export type HelperProfileProgress = {
  /** 0–100, derived from completed checklist items */
  percent: number
  completed: number
  total: number
  missing: string[]
}

/**
 * Honest helper-profile completeness from real Person fields.
 * Used on Browse empty-state "While you wait" — never invent a static %.
 */
export function helperProfileProgress(
  person: Pick<
    Person,
    | 'name'
    | 'city'
    | 'stateCode'
    | 'locationLabel'
    | 'skills'
    | 'hourlyRate'
    | 'rateType'
    | 'bio'
    | 'availability'
    | 'avatar'
    | 'safetyDisclaimerAcceptedAt'
    | 'isHelper'
  >,
): HelperProfileProgress {
  const checks: { id: string; label: string; ok: boolean }[] = [
    { id: 'name', label: 'Display name', ok: Boolean(person.name?.trim()) },
    {
      id: 'location',
      label: 'City',
      ok: Boolean(
        (person.city && person.city.trim()) ||
          (person.locationLabel && person.locationLabel.trim()) ||
          (person.stateCode && person.stateCode.trim()),
      ),
    },
    { id: 'skills', label: 'Skills', ok: (person.skills?.length ?? 0) > 0 },
    {
      id: 'rate',
      label: 'Rate',
      ok: person.rateType === 'quote' || (person.hourlyRate ?? 0) > 0,
    },
    { id: 'bio', label: 'Bio', ok: Boolean(person.bio?.trim()) },
    {
      id: 'availability',
      label: 'Availability',
      ok: (person.availability?.length ?? 0) > 0,
    },
    { id: 'avatar', label: 'Photo', ok: Boolean(person.avatar?.trim()) },
    {
      id: 'safety',
      label: 'Safety acknowledgment',
      ok: Boolean(person.safetyDisclaimerAcceptedAt),
    },
  ]

  const completed = checks.filter((c) => c.ok).length
  const total = checks.length
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
  const missing = checks.filter((c) => !c.ok).map((c) => c.label)

  return { percent, completed, total, missing }
}
