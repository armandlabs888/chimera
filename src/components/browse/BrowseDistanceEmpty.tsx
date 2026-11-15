'use client'

import { radiusPhrase, type BrowseRadiusId } from '@/lib/browseDistance'

export function BrowseDistanceEmpty({
  radius,
  onWiden,
}: {
  radius: BrowseRadiusId
  onWiden: () => void
}) {
  const phrase = radiusPhrase(radius)
  return (
    <div
      className="browse-hc-distance-empty"
      data-testid="browse-distance-empty"
    >
      <h2 className="browse-hc-distance-empty-title">
        No jobs within {phrase} right now
      </h2>
      <p className="browse-hc-distance-empty-body">Widen the distance to see more jobs.</p>
      <button
        type="button"
        onClick={onWiden}
        className="browse-hc-distance-empty-cta"
        data-testid="browse-show-farther"
      >
        Show jobs farther away
      </button>
    </div>
  )
}
