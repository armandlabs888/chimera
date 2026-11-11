'use client'

import { useEffect, type RefObject } from 'react'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusables(root: HTMLElement | null) {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null,
  )
}

/**
 * Trap Tab inside a dialog and close on Escape.
 * Body scroll is locked only while the dialog is open — the browse page itself scrolls normally.
 */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  returnFocusRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!active) return
    const root = containerRef.current
    const previous = document.activeElement as HTMLElement | null
    const initial = focusables(root)
    ;(initial[0] ?? root)?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !root) return
      const items = focusables(root)
      if (!items.length) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      const preferred = returnFocusRef?.current
      if (preferred && document.contains(preferred)) preferred.focus()
      else previous?.focus?.()
    }
  }, [active, containerRef, onClose, returnFocusRef])
}
