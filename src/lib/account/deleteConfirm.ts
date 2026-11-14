/** Exact phrase required to confirm account deletion (case-sensitive after trim). */
export const ACCOUNT_DELETE_CONFIRM_PHRASE = 'I understand'

/** True when the confirm value matches the required phrase (trim only; case-sensitive). */
export function isValidAccountDeleteConfirm(value: unknown): boolean {
  return typeof value === 'string' && value.trim() === ACCOUNT_DELETE_CONFIRM_PHRASE
}
