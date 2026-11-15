'use client'

import {
  BROWSE_RADIUS_OPTIONS,
  type BrowseRadiusId,
} from '@/lib/browseDistance'

export function BrowseDistanceToggle({
  value,
  onChange,
  disabled = false,
}: {
  value: BrowseRadiusId
  onChange: (id: BrowseRadiusId) => void
  disabled?: boolean
}) {
  return (
    <div
      className="browse-hc-distance-toggle"
      role="radiogroup"
      aria-label="Distance"
      data-testid="browse-distance-toggle"
      data-disabled={disabled ? 'true' : 'false'}
    >
      {BROWSE_RADIUS_OPTIONS.map((opt) => {
        const selected = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            data-testid={`browse-distance-${opt.id}`}
            onClick={() => onChange(opt.id)}
            className={`browse-hc-distance-seg${selected ? ' is-selected' : ''}`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
