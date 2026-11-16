'use client'

import { useEffect } from 'react'
import { useBeam } from '@/context/BeamContext'

/** Record one view per viewer when a job detail surface opens. Fails silently. */
export function useRecordHelpRequestView(requestId: string | null | undefined) {
  const { recordHelpRequestView } = useBeam()

  useEffect(() => {
    if (!requestId) return
    void recordHelpRequestView(requestId)
  }, [requestId, recordHelpRequestView])
}
