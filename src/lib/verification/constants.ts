/** Helper verification product copy and limits. No em/en dashes. */

export const VERIFY_MAX_BYTES = 10 * 1024 * 1024

export const VERIFY_ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

export type VerifyAllowedMime = (typeof VERIFY_ALLOWED_MIME)[number]

export const VERIFY_FORM_TITLE = 'Get verified to offer on jobs'

export const VERIFY_FORM_INTRO =
  'Before you can make an offer, Beam needs your full email address, your home address, and a recent electricity or water bill. A person at Beam reviews every submission. You can offer only after they approve you.'

export const VERIFY_TRUST_LINE =
  'This helps ensure trust and safety for everyone involved.'

export const VERIFY_PRIVACY = [
  'Your exact address is never displayed to other users.',
  'We will never sell your address.',
  "It's only used to match you with jobs nearby, and to complete this review.",
] as const

export const VERIFY_EMAIL_HINT =
  "Enter your full email address. We'll use it to tell you when the review is complete."

export const VERIFY_ADDRESS_HINT =
  'This should match the address on your bill. It is never shown on your profile or to neighbors.'

export const VERIFY_BILL_HINT =
  'The bill should be recent and show your name and the home address above. PDF or a clear photo, up to 10 MB.'

export const VERIFY_SUBMIT_HELPER =
  'You can still browse jobs and ask questions while you wait.'

export const GATE_UNVERIFIED =
  'To make an offer, Beam has to verify your address first. A person at Beam reviews every Helper.'

export const GATE_PENDING =
  "Beam is reviewing your documents. You can offer once you're approved. We'll email you when that's done."

export const ONBOARDING_HELPER_VERIFY_TITLE =
  'Address verification is required before you can make an offer'

export const ONBOARDING_HELPER_VERIFY_BODY =
  "You'll need your home address and a recent electricity or water bill that shows your name and that address. You'll be asked for this before you can make an offer, not on this step."

export const ONBOARDING_HELPER_INTRO =
  'Helpers browse nearby requests and offer to do the work. Before you can make an offer, we need to confirm you actually live close by.'

export const ONBOARDING_HELPER_PRIVACY = VERIFY_PRIVACY
