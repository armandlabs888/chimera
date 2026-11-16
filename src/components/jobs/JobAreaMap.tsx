'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resolveAreaCentroid } from '@/lib/areaCentroids'
import { fuzzJobCoordinates } from '@/lib/jobAreaPrivacy'
import { formatJobAreaCaption } from '@/lib/location'
import { JobAreaMapErrorBoundary } from './JobAreaMapErrorBoundary'
import { JobAreaMapStatic } from './JobAreaMapStatic'
import './job-area-map.css'

const JobAreaMapInteractive = dynamic(
  () =>
    import('./JobAreaMapInteractive').then((mod) => mod.JobAreaMapInteractive),
  {
    ssr: false,
    loading: () => <div className="job-area-map-placeholder" aria-hidden />,
  },
)

type Props = {
  jobId: string
  lat?: number | null
  lng?: number | null
  /** Used when lat/lng are missing: match neighborhood or location_label. */
  locationLabel?: string | null
  neighborhood?: string | null
  city?: string | null
  radiusMiles?: number | null
  /**
   * Optional display override. Prefer job locationLabel/neighborhood/city;
   * do not pass the viewer browse area here.
   */
  areaLabel?: string
  className?: string
  /**
   * Optional fixed frame height in px. When omitted, CSS uses 260px on mobile
   * and 320px on desktop.
   */
  height?: number
}

/**
 * Neighborhood area map: interactive Leaflet when available, static OSM mosaic fallback.
 * Coordinates are fuzzed for privacy; zoom is clamped to neighborhood level.
 */
export function JobAreaMap({
  jobId,
  lat,
  lng,
  locationLabel,
  neighborhood,
  city,
  radiusMiles,
  areaLabel,
  className = '',
  height,
}: Props) {
  const rootRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )
  const [mode, setMode] = useState<'interactive' | 'static'>('interactive')

  const fuzzed = useMemo(() => {
    const point = resolveAreaCentroid({
      lat,
      lng,
      locationLabel,
      neighborhood,
      city,
    })
    if (!point) return null
    return fuzzJobCoordinates(jobId, point.lat, point.lng, radiusMiles)
  }, [jobId, lat, lng, locationLabel, neighborhood, city, radiusMiles])

  const caption = useMemo(() => {
    const fromJob = formatJobAreaCaption({
      locationLabel,
      neighborhood,
      city,
    })
    if (fromJob && fromJob !== 'Nearby') return fromJob
    const override = areaLabel?.trim() || ''
    // Reject viewer browse placeholders that must never appear on a job map.
    if (!override) return 'Nearby'
    const lower = override.toLowerCase()
    if (lower === 'you' || lower === 'your area' || lower.endsWith(', you')) {
      return 'Nearby'
    }
    return override
  }, [locationLabel, neighborhood, city, areaLabel])

  useEffect(() => {
    if (!fuzzed) return
    if (typeof IntersectionObserver === 'undefined') return
    const node = rootRef.current
    if (!node) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: '120px' },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [fuzzed])

  const fallBackToStatic = useCallback(() => {
    setMode('static')
  }, [])

  if (!fuzzed) return null

  const label = caption
  const frameHeight = height

  return (
    <section
      ref={rootRef}
      className={`job-area-map ${className}`.trim()}
      data-testid="job-area-map"
      data-map-mode={mode}
      aria-label={`Approximate area near ${label}`}
    >
      {visible && mode === 'interactive' ? (
        <div
          className="job-area-map-interactive-host"
          style={frameHeight != null ? { height: frameHeight } : undefined}
        >
          <JobAreaMapErrorBoundary onError={fallBackToStatic}>
            <JobAreaMapInteractive
              fuzzed={fuzzed}
              onFatalError={fallBackToStatic}
            />
          </JobAreaMapErrorBoundary>
        </div>
      ) : (
        <JobAreaMapStatic
          fuzzed={fuzzed}
          height={frameHeight}
          visible={visible}
        />
      )}
      <div className="job-area-map-meta">
        <p className="job-area-map-place">{label}</p>
        <p className="job-area-map-approx">Approximate area</p>
      </div>
      {mode === 'static' ? (
        <p className="job-area-map-attr">
          &copy;{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>{' '}
          contributors
        </p>
      ) : null}
    </section>
  )
}
