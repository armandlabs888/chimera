import { redirect } from 'next/navigation'

/**
 * Inbox route stays addressable. Signed-in visitors land on Browse with the
 * list drawer open so the page underneath stays a real screen.
 * Live guests are sent to /auth by the proxy before this redirect runs.
 */
export default function MessagesPage() {
  redirect('/browse?messages=1')
}
