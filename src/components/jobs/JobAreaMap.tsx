'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  fuzzJobCoordinates,
  latLngToWorldPixel,
  metersToPixels,
} from '@/lib/jobAreaPrivacy'
import './job-area-map.css'

const TILE_ZOOM = 14
const TILE_SIZE = 256
/** OSM raster tiles: free, no API key. Lazy 3x2 mosaic only (no prefetch). */
const TILE_TMPL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

type Props = {
  jobId: string
  lat?: number | null
  lng?: number | null
  radiusMiles?: number | null
  /** Neighborhood label, e.g. "Cambrian, San Jose". */
  areaLabel: string
  className?: string
  /** Map frame height in px (160 to 200). */
  height?: number
}

function tileUrl(z: number, x: number, y: number): string {
  return TILE_TMPL.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y))
}

/**
 * Lazy, non-interactive neighborhood area map.
 * Hides itself when lat/lng are missing. Coordinates are fuzzed for privacy.
 */
export function JobAreaMap({
  jobId,
  lat,
  lng,
  radiusMiles,
  areaLabel,
  className = '',
  height = 180,
}: Props) {
  const rootRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )

  const fuzzed = useMemo(() => {
    if (typeof lat !== 'number' || typeof lng !== 'number') return null
    return fuzzJobCoordinates(jobId, lat, lng, radiusMiles)
  }, [jobId, lat, lng, radiusMiles])

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

  const mosaic = useMemo(() => {
    if (!fuzzed) return null
    const { x: worldX, y: worldY } = latLngToWorldPixel(fuzzed.lat, fuzzed.lng, TILE_ZOOM)
    const centerTileX = Math.floor(worldX / TILE_SIZE)
    const centerTileY = Math.floor(worldY / TILE_SIZE)
    // 3x3 mosaic so the pin can sit at the frame center with cover.
    const tilesX = 3
    const tilesY = 3
    const originTileX = centerTileX - 1
    const originTileY = centerTileY - 1
    const mosaicW = tilesX * TILE_SIZE
    const mosaicH = tilesY * TILE_SIZE
    const markerX = worldX - originTileX * TILE_SIZE
    const markerY = worldY - originTileY * TILE_SIZE
    const circlePx = metersToPixels(fuzzed.radiusMeters, fuzzed.lat, TILE_ZOOM)

    const tiles: { key: string; src: string; left: number; top: number }[] = []
    for (let ty = 0; ty < tilesY; ty += 1) {
      for (let tx = 0; tx < tilesX; tx += 1) {
        const x = originTileX + tx
        const y = originTileY + ty
        tiles.push({
          key: `${TILE_ZOOM}/${x}/${y}`,
          src: tileUrl(TILE_ZOOM, x, y),
          left: tx * TILE_SIZE,
          top: ty * TILE_SIZE,
        })
      }
    }

    return { tiles, mosaicW, mosaicH, markerX, markerY, circlePx }
  }, [fuzzed])

  if (!fuzzed || !mosaic) return null

  const label = areaLabel.trim() || 'Nearby'

  return (
    <section
      ref={rootRef}
      className={`job-area-map ${className}`.trim()}
      data-testid="job-area-map"
      aria-label={`Approximate area near ${label}`}
    >
      <div className="job-area-map-frame" style={{ height }}>
        {visible ? (
          <div
            className="job-area-map-mosaic"
            style={{
              width: mosaic.mosaicW,
              height: mosaic.mosaicH,
              // Pin the fuzzed point to the frame center (not the mosaic center).
              left: `calc(50% - ${mosaic.markerX}px)`,
              top: `calc(50% - ${mosaic.markerY}px)`,
            }}
            aria-hidden
          >
            {mosaic.tiles.map((t) => (
              <img
                key={t.key}
                src={t.src}
                alt=""
                width={TILE_SIZE}
                height={TILE_SIZE}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="job-area-map-tile"
                style={{ left: t.left, top: t.top }}
              />
            ))}
            <span
              className="job-area-map-circle"
              style={{
                width: mosaic.circlePx * 2,
                height: mosaic.circlePx * 2,
                left: mosaic.markerX,
                top: mosaic.markerY,
              }}
            />
            <span
              className="job-area-map-star"
              style={{ left: mosaic.markerX, top: mosaic.markerY }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path
                  d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.4l1.1-6.5L2.6 9.3l6.5-.9L12 2.5z"
                  fill="#1D5CE5"
                  stroke="#FFFFFF"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        ) : (
          <div className="job-area-map-placeholder" aria-hidden />
        )}
      </div>
      <div className="job-area-map-meta">
        <p className="job-area-map-place">{label}</p>
        <p className="job-area-map-approx">Approximate area</p>
      </div>
      <p className="job-area-map-attr">
        &copy;{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>{' '}
        contributors
      </p>
    </section>
  )
}
