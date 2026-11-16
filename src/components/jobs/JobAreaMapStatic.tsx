'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  latLngToWorldPixel,
  metersToPixels,
  type FuzzedJobPoint,
} from '@/lib/jobAreaPrivacy'

const TILE_ZOOM = 14
const TILE_SIZE = 256
const TILE_TMPL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const STAR_SIZE = 24

type Props = {
  fuzzed: FuzzedJobPoint
  /** Fixed height override. Omit to use CSS (260 mobile / 320 desktop). */
  height?: number
  /** When false, show the soft placeholder instead of fetching tiles. */
  visible?: boolean
}

function tileUrl(z: number, x: number, y: number): string {
  return TILE_TMPL.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y))
}

function wrapTileIndex(n: number, z: number): number {
  const max = 2 ** z
  return ((n % max) + max) % max
}

/**
 * Non-interactive OSM tile mosaic used as the fallback when Leaflet fails.
 */
export function JobAreaMapStatic({ fuzzed, height, visible = true }: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const fallbackH = height ?? 260
  const [frameSize, setFrameSize] = useState({ width: 0, height: fallbackH })

  useEffect(() => {
    const frame = frameRef.current
    if (!frame || typeof ResizeObserver === 'undefined') {
      setFrameSize({ width: frame?.clientWidth ?? 640, height: fallbackH })
      return
    }
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const w = Math.round(entry.contentRect.width)
      const h = Math.round(entry.contentRect.height) || fallbackH
      setFrameSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }))
    })
    ro.observe(frame)
    setFrameSize({
      width: Math.round(frame.clientWidth) || 640,
      height: Math.round(frame.clientHeight) || fallbackH,
    })
    return () => ro.disconnect()
  }, [fallbackH, fuzzed])

  const mosaic = useMemo(() => {
    const frameW = Math.max(frameSize.width, 320)
    const frameH = Math.max(frameSize.height, fallbackH)
    const { x: worldX, y: worldY } = latLngToWorldPixel(fuzzed.lat, fuzzed.lng, TILE_ZOOM)

    const pad = TILE_SIZE + 8
    const minWorldX = worldX - frameW / 2 - pad
    const maxWorldX = worldX + frameW / 2 + pad
    const minWorldY = worldY - frameH / 2 - pad
    const maxWorldY = worldY + frameH / 2 + pad

    const originTileX = Math.floor(minWorldX / TILE_SIZE)
    const originTileY = Math.floor(minWorldY / TILE_SIZE)
    const endTileX = Math.floor(maxWorldX / TILE_SIZE)
    const endTileY = Math.floor(maxWorldY / TILE_SIZE)
    const tilesX = endTileX - originTileX + 1
    const tilesY = endTileY - originTileY + 1

    const mosaicW = tilesX * TILE_SIZE
    const mosaicH = tilesY * TILE_SIZE
    const markerX = worldX - originTileX * TILE_SIZE
    const markerY = worldY - originTileY * TILE_SIZE

    const rawCircle = metersToPixels(fuzzed.radiusMeters, fuzzed.lat, TILE_ZOOM)
    const maxRadius = Math.min(frameW, frameH) * 0.36
    const circlePx = Math.min(rawCircle, maxRadius)

    const tiles: { key: string; src: string; left: number; top: number }[] = []
    for (let ty = 0; ty < tilesY; ty += 1) {
      for (let tx = 0; tx < tilesX; tx += 1) {
        const x = wrapTileIndex(originTileX + tx, TILE_ZOOM)
        const y = originTileY + ty
        if (y < 0 || y >= 2 ** TILE_ZOOM) continue
        tiles.push({
          key: `${TILE_ZOOM}/${x}/${y}`,
          src: tileUrl(TILE_ZOOM, x, y),
          left: tx * TILE_SIZE,
          top: ty * TILE_SIZE,
        })
      }
    }

    return { tiles, mosaicW, mosaicH, markerX, markerY, circlePx }
  }, [fuzzed, frameSize.width, frameSize.height, fallbackH])

  return (
    <div
      ref={frameRef}
      className="job-area-map-frame"
      style={height != null ? { height } : undefined}
      data-testid="job-area-map-static"
    >
      {visible ? (
        <div
          className="job-area-map-mosaic"
          style={{
            width: mosaic.mosaicW,
            height: mosaic.mosaicH,
            transform: `translate(${Math.round(frameSize.width / 2 - mosaic.markerX) - 2}px, ${Math.round(frameSize.height / 2 - mosaic.markerY) - 2}px)`,
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
            <svg viewBox="0 0 24 24" width={STAR_SIZE} height={STAR_SIZE} aria-hidden>
              <path
                d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.4l1.1-6.5L2.6 9.3l6.5-.9L12 2.5z"
                fill="#1D5CE5"
                stroke="#FFFFFF"
                strokeWidth="2.25"
                strokeLinejoin="round"
                paintOrder="stroke fill"
              />
            </svg>
          </span>
        </div>
      ) : (
        <div className="job-area-map-placeholder" aria-hidden />
      )}
    </div>
  )
}
