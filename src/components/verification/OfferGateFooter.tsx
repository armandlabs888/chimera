'use client'

import { Info } from 'lucide-react'
import Link from 'next/link'
import { GATE_UNVERIFIED } from '@/lib/verification/constants'
import { offerGateKind, type OfferGateKind } from '@/lib/verification/status'
import type { HelperVerification } from '@/types'

export function OfferGateNotice({
  verification,
  narrow,
}: {
  verification: HelperVerification | null | undefined
  narrow?: boolean
}) {
  const kind = offerGateKind(verification)
  if (kind === 'approved') return null

  const reason =
    kind === 'needs_resubmission'
      ? verification?.reviewReason?.trim() || GATE_UNVERIFIED
      : GATE_UNVERIFIED

  return (
    <div
      className={`flex items-start gap-2.5 rounded-[10px] border border-[#D6E2F5] bg-[#F5F9FF] ${
        narrow ? 'px-3.5 py-3' : 'px-4 py-3'
      }`}
      data-testid="offer-gate-notice"
      data-gate={kind === 'pending' ? 'unverified' : kind}
      role="status"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1D5CE5]" strokeWidth={2.25} aria-hidden />
      <p className="text-[13.5px] leading-[1.45] text-[#273449]">{reason}</p>
    </div>
  )
}

export function OfferGatePrimaryButton({
  kind,
  narrow,
  className = '',
}: {
  kind: Exclude<OfferGateKind, 'approved'>
  narrow?: boolean
  className?: string
}) {
  return (
    <Link
      href="/verify"
      data-testid="browse-offer-gated"
      data-gate={kind === 'pending' ? 'unverified' : kind}
      className={`inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-[#1D5CE5] px-[18px] text-[14px] font-semibold tracking-[-0.01em] text-white hover:bg-[#1649BD] ${
        narrow ? 'w-full' : 'shrink-0'
      } ${className}`}
    >
      Get verified
    </Link>
  )
}
