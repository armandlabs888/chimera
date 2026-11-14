'use client'

import type { ReactNode } from 'react'
import './job-detail-photo.css'

/**
 * Job detail cover photo: ~4:3 frame, full image via object-fit contain,
 * soft blurred fill (or #F5F9FF) so portrait / wide shots are not cropped.
 * Used by Browse panel, Browse sheet/drawer, and /requests/[id].
 */
export function JobDetailPhoto({
  src,
  alt = '',
  className = '',
  children,
  fallback,
  showBottomScrim = false,
  testId,
}: {
  src: string | null | undefined
  alt?: string
  className?: string
  children?: ReactNode
  fallback?: ReactNode
  /** Dark bottom fade for light overlays (category / Save). */
  showBottomScrim?: boolean
  testId?: string
}) {
  return (
    <div
      className={`job-detail-photo ${showBottomScrim ? 'job-detail-photo--scrim' : ''} ${className}`.trim()}
      data-testid={testId ?? 'job-detail-photo'}
    >
      {src ? (
        <>
          {/* Listing photos may be arbitrary HTTPS hosts. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            aria-hidden
            className="job-detail-photo-blur"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="job-detail-photo-main" />
        </>
      ) : (
        <div className="job-detail-photo-fallback">{fallback}</div>
      )}
      {children}
    </div>
  )
}
