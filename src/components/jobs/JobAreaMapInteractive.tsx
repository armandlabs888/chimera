'use client'

import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  ZoomControl,
  useMap,
} from 'react-leaflet'
import type { FuzzedJobPoint } from '@/lib/jobAreaPrivacy'
import 'leaflet/dist/leaflet.css'

export const JOB_AREA_DEFAULT_ZOOM = 14
export const JOB_AREA_MAX_ZOOM = 16
export const JOB_AREA_MIN_ZOOM = 11

const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const STAR_SVG =
  '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">' +
  '<path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.4l1.1-6.5L2.6 9.3l6.5-.9L12 2.5z" ' +
  'fill="#1D5CE5" stroke="#FFFFFF" stroke-width="2.25" stroke-linejoin="round" paint-order="stroke fill"/>' +
  '</svg>'

type Props = {
  fuzzed: FuzzedJobPoint
  /** Called when tiles fail repeatedly so the parent can show the static mosaic. */
  onFatalError?: () => void
}

function createStarIcon() {
  return L.divIcon({
    className: 'job-area-map-star-icon',
    html: `<span class="job-area-map-star job-area-map-star--leaflet">${STAR_SVG}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

/** Click/focus enables wheel zoom; ctrl/cmd+wheel zooms without hijacking page scroll. */
function MapInteraction({ onFatalError }: { onFatalError?: () => void }) {
  const map = useMap()

  useEffect(() => {
    const el = map.getContainer()
    el.setAttribute('tabindex', '0')
    el.setAttribute('data-testid', 'job-area-map-leaflet')
    map.scrollWheelZoom.disable()
    map.setMaxZoom(JOB_AREA_MAX_ZOOM)
    map.setMinZoom(JOB_AREA_MIN_ZOOM)

    const enableWheel = () => {
      map.scrollWheelZoom.enable()
    }
    const disableWheel = () => {
      map.scrollWheelZoom.disable()
    }

    const onClick = () => {
      el.focus({ preventScroll: true })
    }

    const onWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      event.preventDefault()
      if (map.scrollWheelZoom.enabled()) return
      const next = map.getZoom() + (event.deltaY < 0 ? 1 : -1)
      map.setZoom(Math.min(JOB_AREA_MAX_ZOOM, Math.max(JOB_AREA_MIN_ZOOM, next)))
    }

    let tileFails = 0
    const onTileError = () => {
      tileFails += 1
      if (tileFails >= 4) onFatalError?.()
    }

    map.on('click', onClick)
    map.on('focus', enableWheel)
    map.on('blur', disableWheel)
    map.on('tileerror', onTileError)
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      map.off('click', onClick)
      map.off('focus', enableWheel)
      map.off('blur', disableWheel)
      map.off('tileerror', onTileError)
      el.removeEventListener('wheel', onWheel)
    }
  }, [map, onFatalError])

  return null
}

function ResetViewControl({
  center,
  zoom,
}: {
  center: [number, number]
  zoom: number
}) {
  const map = useMap()

  useEffect(() => {
    const control = new L.Control({ position: 'topright' })
    control.onAdd = () => {
      const btn = L.DomUtil.create('button', 'job-area-map-reset') as HTMLButtonElement
      btn.type = 'button'
      btn.textContent = 'Reset view'
      btn.setAttribute('data-testid', 'job-area-map-reset')
      L.DomEvent.disableClickPropagation(btn)
      L.DomEvent.disableScrollPropagation(btn)
      L.DomEvent.on(btn, 'click', () => {
        map.setView(center, zoom, { animate: true })
      })
      return btn
    }
    control.addTo(map)
    return () => {
      control.remove()
    }
  }, [map, center, zoom])

  return null
}

export function JobAreaMapInteractive({ fuzzed, onFatalError }: Props) {
  const center = useMemo<[number, number]>(
    () => [fuzzed.lat, fuzzed.lng],
    [fuzzed.lat, fuzzed.lng],
  )
  const icon = useMemo(() => createStarIcon(), [])

  return (
    <div
      className="job-area-map-frame job-area-map-frame--interactive"
      data-testid="job-area-map-interactive"
    >
      <MapContainer
        center={center}
        zoom={JOB_AREA_DEFAULT_ZOOM}
        minZoom={JOB_AREA_MIN_ZOOM}
        maxZoom={JOB_AREA_MAX_ZOOM}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl
        className="job-area-map-leaflet"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url={OSM_URL} attribution={OSM_ATTR} maxZoom={JOB_AREA_MAX_ZOOM} />
        <ZoomControl position="topleft" />
        <Circle
          center={center}
          radius={fuzzed.radiusMeters}
          pathOptions={{
            color: '#1D5CE5',
            weight: 1.5,
            opacity: 0.42,
            fillColor: '#1D5CE5',
            fillOpacity: 0.18,
          }}
        />
        <Marker position={center} icon={icon} interactive={false} />
        <MapInteraction onFatalError={onFatalError} />
        <ResetViewControl center={center} zoom={JOB_AREA_DEFAULT_ZOOM} />
      </MapContainer>
    </div>
  )
}
