'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/** Brief banner after hard account deletion redirects to `/`. */
export function AccountDeletedNotice() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const show = params.get('account') === 'deleted'

  useEffect(() => {
    if (!show) return
    const next = new URLSearchParams(params.toString())
    next.delete('account')
    const qs = next.toString()
    const timer = window.setTimeout(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }, 8000)
    return () => window.clearTimeout(timer)
  }, [show, params, pathname, router])

  if (!show) return null

  return (
    <div
      className="border-b border-[#D7E0EC] bg-[#F5F9FF] px-4 py-3 text-center text-[14px] font-medium text-[#071330]"
      role="status"
      data-testid="account-deleted-notice"
    >
      Your account has been deleted.
    </div>
  )
}
