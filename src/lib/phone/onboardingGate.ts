/**
 * Phone confirm + helper alerts are required/available only when Twilio can send
 * and receive texts. Without env, onboarding keeps the original 2-step flow so
 * signups are not blocked.
 */
export function isPhoneConfirmEnabled(twilioConfigured: boolean): boolean {
  return Boolean(twilioConfigured)
}

/** Total onboarding steps for the progress counter (edit mode is always 2). */
export function onboardingStepTotal(input: {
  edit?: boolean
  isHelper: boolean
  phoneConfirmEnabled: boolean
}): number {
  if (input.edit) return 2
  if (!input.phoneConfirmEnabled) return 2
  return input.isHelper ? 4 : 3
}

/** Community-rules step index (1-based) given the same gates. */
export function onboardingRulesStepNumber(input: {
  edit?: boolean
  isHelper: boolean
  phoneConfirmEnabled: boolean
}): number {
  if (input.edit || !input.phoneConfirmEnabled) return 2
  return input.isHelper ? 4 : 3
}
