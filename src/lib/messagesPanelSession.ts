/** Session-scoped minimize flag for the floating messages panel. */
const MINIMIZED_KEY = 'bunk.messages.minimized'

export function readMessagesMinimized(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(MINIMIZED_KEY) === '1'
  } catch {
    return false
  }
}

export function writeMessagesMinimized(minimized: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (minimized) sessionStorage.setItem(MINIMIZED_KEY, '1')
    else sessionStorage.removeItem(MINIMIZED_KEY)
  } catch {
    // Ignore quota / private-mode failures; panel still works for this page.
  }
}
