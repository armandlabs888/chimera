import { URGENT_LABEL } from '@/lib/urgent/constants'

/** Small blue label for urgent jobs. No decorative chrome. */
export function NeedsHelpNowLabel({
  className = '',
}: {
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-[#EEF4FF] px-2 py-0.5 text-[11px] font-semibold tracking-tight text-[#1D5CE5] ${className}`}
      data-testid="needs-help-now-label"
    >
      {URGENT_LABEL}
    </span>
  )
}
