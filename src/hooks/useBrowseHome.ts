'use client'

import { useCallback, useEffect, useState } from 'react'
import type { HelpRequest, HelperVerification, Person } from '@/types'
import {
  pinFromZipPlace,
  readBrowseLocationPin,
  subscribeBrowseLocationPin,
  writeBrowseLocationPin,
  type BrowseLocationPin,
} from '@/lib/browseLocationPreference'
import {
  resolveBrowseHome,
  resolveBrowseHomeSync,
  type BrowseHome,
} from '@/lib/browseHome'

const EMPTY_HOME: BrowseHome = {
  lat: null,
  lng: null,
  zip: null,
  label: 'your area',
  source: 'none',
  hasOrigin: false,
}

export function useBrowseHome(input: {
  person: Person
  helperVerification: HelperVerification | null
  requests: HelpRequest[]
}): {
  home: BrowseHome
  pin: BrowseLocationPin | null
  ready: boolean
  setFromZipPlace: (place: {
    zip: string
    city: string
    stateCode: string
    lat: number
    lng: number
    label: string
  }) => void
  clearPin: () => void
} {
  const [pin, setPin] = useState<BrowseLocationPin | null>(() => readBrowseLocationPin())
  const [home, setHome] = useState<BrowseHome>(() => {
    return (
      resolveBrowseHomeSync({
        helperVerification: input.helperVerification,
        pin: readBrowseLocationPin(),
      }) ?? EMPTY_HOME
    )
  })
  const [ready, setReady] = useState(() => {
    const sync = resolveBrowseHomeSync({
      helperVerification: input.helperVerification,
      pin: readBrowseLocationPin(),
    })
    return sync?.source === 'verification'
  })

  useEffect(() => {
    setPin(readBrowseLocationPin())
    return subscribeBrowseLocationPin(() => {
      setPin(readBrowseLocationPin())
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const sync = resolveBrowseHomeSync({
      helperVerification: input.helperVerification,
      pin,
    })
    if (sync?.source === 'verification') {
      setHome(sync)
      setReady(true)
      return
    }
    if (sync) setHome(sync)
    setReady(false)
    void resolveBrowseHome({
      person: input.person,
      helperVerification: input.helperVerification,
      requests: input.requests,
      pin,
    }).then((next) => {
      if (cancelled) return
      setHome(next)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [input.person, input.helperVerification, input.requests, pin])

  const setFromZipPlace = useCallback(
    (place: {
      zip: string
      city: string
      stateCode: string
      lat: number
      lng: number
      label: string
    }) => {
      const next = pinFromZipPlace(place)
      writeBrowseLocationPin(next)
      setPin(next)
    },
    [],
  )

  const clearPin = useCallback(() => {
    writeBrowseLocationPin(null)
    setPin(null)
  }, [])

  return {
    home,
    pin,
    ready,
    setFromZipPlace,
    clearPin,
  }
}
