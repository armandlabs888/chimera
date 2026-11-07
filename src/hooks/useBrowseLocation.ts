'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Person } from '@/types'
import {
  pinFromUsCity,
  readBrowseLocationPin,
  resolveBrowseOrigin,
  subscribeBrowseLocationPin,
  writeBrowseLocationPin,
  type BrowseLocationPin,
  type BrowseOrigin,
} from '@/lib/browseLocationPreference'
import type { UsCity } from '@/lib/usPlaces'

export function useBrowseLocation(
  person: Pick<Person, 'city' | 'stateCode' | 'locationLabel' | 'lat' | 'lng'>,
): {
  pin: BrowseLocationPin | null
  origin: BrowseOrigin
  setCity: (city: UsCity) => void
  clearPin: () => void
  isOverridden: boolean
} {
  const [pin, setPin] = useState<BrowseLocationPin | null>(null)

  useEffect(() => {
    setPin(readBrowseLocationPin())
    return subscribeBrowseLocationPin(() => {
      setPin(readBrowseLocationPin())
    })
  }, [])

  const origin = useMemo(() => resolveBrowseOrigin(pin, person), [pin, person])

  return {
    pin,
    origin,
    setCity: (city: UsCity) => {
      const next = pinFromUsCity(city)
      writeBrowseLocationPin(next)
      setPin(next)
    },
    clearPin: () => {
      writeBrowseLocationPin(null)
      setPin(null)
    },
    isOverridden: pin != null,
  }
}
