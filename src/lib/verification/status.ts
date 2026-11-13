import type { HelperVerification, HelperVerificationStatus } from '@/types'

export type OfferGateKind = 'unverified' | 'pending' | 'needs_resubmission' | 'approved'

export function offerGateKind(
  verification: HelperVerification | null | undefined,
): OfferGateKind {
  if (!verification) return 'unverified'
  if (verification.status === 'approved') return 'approved'
  // Location misses stay unverified (retry). Legacy pending bill rows still gate offers.
  if (verification.status === 'pending') return 'pending'
  if (verification.status === 'needs_resubmission') return 'needs_resubmission'
  return 'unverified'
}

export function canMakeOffer(verification: HelperVerification | null | undefined): boolean {
  return offerGateKind(verification) === 'approved'
}

export function formatVerificationAddress(v: Pick<
  HelperVerification,
  'street' | 'apt' | 'city' | 'stateCode' | 'zip'
>): string {
  const line1 = v.apt?.trim() ? `${v.street}, ${v.apt.trim()}` : v.street
  return `${line1}, ${v.city}, ${v.stateCode} ${v.zip}`
}

export function statusLabel(status: HelperVerificationStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending review'
    case 'approved':
      return 'Verified'
    case 'needs_resubmission':
      return 'Try again'
    case 'unverified':
      return 'Not verified'
  }
}

export function isStaffReviewable(status: HelperVerificationStatus): boolean {
  return status === 'unverified' || status === 'pending' || status === 'needs_resubmission'
}
