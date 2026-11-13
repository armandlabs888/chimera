/** Helper verification product copy and limits. No em dashes. */

import { PRODUCT_NAME } from '@/lib/brand'

export const VERIFY_FORM_TITLE = 'Get verified to offer on jobs'

export const VERIFY_FORM_INTRO = `Before you can make an offer, ${PRODUCT_NAME} needs your full email address and your home address. You have to be at that address so we can confirm it. This takes a moment, and you can offer as soon as it matches.`

export const VERIFY_FORM_INTRO_MOBILE = `${PRODUCT_NAME} needs your full email and home address. You have to be at that address so we can confirm it. You can offer as soon as it matches.`

export const VERIFY_FORM_RETRY_INTRO =
  "When you're at this address, confirm again. We'll ask for your location once, only for this check."

export const VERIFY_TRUST_LINE =
  'This helps ensure trust and safety for everyone involved.'

export const VERIFY_PRIVACY = [
  'Your exact address is never displayed to other users.',
  'We will never sell your address.',
  "It's only used to match you with jobs nearby, and to confirm you're at this address.",
  'We only use your location once for this check. We do not track you.',
] as const

export const VERIFY_PRIVACY_MOBILE = [
  'Your exact address is never displayed to other users.',
  'We will never sell your address.',
  "It's only used to match you with nearby jobs, and to confirm you're at this address.",
  'We only use your location once. We do not track you.',
] as const

export const VERIFY_EMAIL_HINT = 'Enter your full email address.'

export const VERIFY_ADDRESS_HINT =
  'This should be the home you are at right now. It is never shown on your profile or to neighbors.'

export const VERIFY_ADDRESS_HINT_MOBILE =
  'This should be the home you are at right now. It is never shown to other users.'

export const VERIFY_CONFIRM_HINT =
  "You need to be physically at this address. We'll ask your browser for your location once, only for this check."

export const VERIFY_CONFIRM_HINT_MOBILE =
  "We'll ask for your location once, only for this check."

export const VERIFY_LOC_BOX_TITLE = 'Be at this address when you confirm'

export const VERIFY_LOC_BOX_BODY =
  "If you're not home right now, you can come back and try again later. This works best on your phone."

export const VERIFY_LOC_BOX_BODY_MOBILE =
  "If you're not home, come back and try again later."

export const VERIFY_SUBMIT_HELPER =
  "You can still browse jobs and ask questions until you're verified."

export const VERIFY_PERMISSION_HELPER =
  'If location access was denied, turn it on in your browser settings, then try again.'

export const VERIFY_NOT_HOME_TITLE =
  "It looks like you're not at this address right now"

export const VERIFY_NOT_HOME_BODY =
  "Try again when you're home. This works best on your phone. Your address is saved, and you can still browse jobs and ask questions."

export const VERIFY_SUCCESS_TITLE = "You're verified"

export const VERIFY_SUCCESS_BODY =
  "You're at this address, so you can make offers on local jobs right away."

export const VERIFY_CTA_CONFIRM = "Confirm you're home"

export const VERIFY_CTA_RETRY = 'Try again'

export const VERIFY_PRIVACY_HEADING = `How ${PRODUCT_NAME} uses this`

export const GATE_UNVERIFIED = `To make an offer, ${PRODUCT_NAME} has to confirm you're at your home address. You need to be home for this check.`

export const ONBOARDING_HELPER_VERIFY_TITLE =
  'Address verification is required before you can make an offer'

export const ONBOARDING_HELPER_VERIFY_BODY = `You'll need your full email and home address. You have to be at that address so we can confirm it with a one-time location check. You'll be asked for this before you can make an offer, not on this step.`

export const ONBOARDING_HELPER_INTRO =
  'Helpers browse nearby requests and offer to do the work. Before you can make an offer, we need to confirm you actually live close by.'

export const ONBOARDING_HELPER_PRIVACY = VERIFY_PRIVACY

/** GPS: reject coarse readings (about 250m). Match within about 150m + accuracy buffer, hard-capped. */
export const VERIFY_MAX_ACCURACY_M = 250
export const VERIFY_MATCH_RADIUS_M = 150
export const VERIFY_MATCH_HARD_CAP_M = 200
