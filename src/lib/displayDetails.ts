/**
 * Display-only formatting for job details.
 * Sample markers stay in stored text so ops can find and remove sample jobs;
 * they must not appear in any user-facing UI.
 */

const SAMPLE_MARKER_RE = /\n*\[(?:HouseCall|Bunk|Beam|BlockSide) sample[^\]]*\]\s*$/i

/** Strip a trailing HouseCall/Bunk/Beam/BlockSide sample marker line from details for display. */
export function formatJobDetailsDisplay(details: string): string {
  if (!details) return ''
  return details.replace(SAMPLE_MARKER_RE, '').trimEnd()
}
