import type { ReactNode } from 'react'
import '@/components/browse/browse-hc.css'

/**
 * Display-only title formatting so compound words like "1-bedroom" do not
 * break after the hyphen. Does not mutate stored title text.
 */
export function formatJobTitleDisplay(title: string): string {
  return title.replace(/-/g, '\u2011')
}

export function referHelperShareText(title: string): string {
  return `Know someone who could help? This job is open on Bunk: ${title}`
}

/**
 * Render a job title with hyphenated compounds kept on one line.
 * Uses non-breaking hyphens plus nowrap spans (no em/en dashes).
 */
export function JobTitleText({ title }: { title: string }): ReactNode {
  const parts = title.split(/(\S*-\S*)/g)
  return parts.map((part, i) => {
    if (!part.includes('-')) return part
    return (
      <span key={`${i}-${part}`} className="job-title-nobreak">
        {formatJobTitleDisplay(part)}
      </span>
    )
  })
}
