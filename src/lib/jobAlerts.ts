/** In-app job-alert preference (no push). Persisted locally for honest toggle state. */

const STORAGE_KEY = 'beam-job-alerts-v1'

export type JobAlertsPreference = {
  enabled: boolean
  updatedAt: string | null
}

export function readJobAlertsPreference(): JobAlertsPreference {
  if (typeof window === 'undefined') {
    return { enabled: false, updatedAt: null }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { enabled: false, updatedAt: null }
    const parsed = JSON.parse(raw) as Partial<JobAlertsPreference>
    return {
      enabled: Boolean(parsed.enabled),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    }
  } catch {
    return { enabled: false, updatedAt: null }
  }
}

export function writeJobAlertsPreference(enabled: boolean): JobAlertsPreference {
  const next: JobAlertsPreference = {
    enabled,
    updatedAt: new Date().toISOString(),
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }
  return next
}
