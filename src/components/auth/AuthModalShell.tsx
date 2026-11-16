'use client'

import Image from 'next/image'
import { type ReactNode, type Ref } from 'react'
import { BunkWordmark } from '@/components/BunkWordmark'
import { LIFESTYLE } from '@/data/media'
import './auth-shell.css'

const BULLETS = [
  'Post a task in a minute',
  'Compare offers from people nearby',
  'Pick who fits and message them',
] as const

type Props = {
  titleId: string
  modalRef?: Ref<HTMLDivElement>
  onClose?: () => void
  testId?: string
  children: ReactNode
}

export function AuthModalShell({
  titleId,
  modalRef,
  onClose,
  testId = 'auth-modal',
  children,
}: Props) {
  return (
    <div className="auth-shell-overlay" data-testid={`${testId}-overlay`}>
      <div
        className="auth-shell-scrim"
        data-testid={`${testId}-scrim`}
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid={testId}
        className="auth-shell-card"
      >
        <div className="auth-shell-form">
          <BunkWordmark size={18} className="mb-1 w-fit self-start" />
          {children}
        </div>

        <AsidePanel />

        {/* Close last in DOM so initial focus lands on the form, not the X. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          data-testid={`${testId}-close`}
          className="auth-shell-close"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function VerifyBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`auth-shell-verify items-center gap-2 self-start rounded-[10px] border border-[#D7E0EC] bg-white px-3 py-2 text-[13px] font-semibold leading-tight text-[#071330] shadow-[0_1px_2px_rgba(7,19,48,0.04)] ${className}`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1D5CE5"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="shrink-0"
      >
        <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        <path d="M9.5 12.2l1.7 1.7 3.4-3.6" />
      </svg>
      Helpers verify they live nearby
    </span>
  )
}

function AsidePanel() {
  return (
    <aside className="auth-shell-aside" data-testid="auth-aside-panel">
      <div className="auth-shell-aside-inner">
        <p className={`auth-shell-aside-title font-display`}>
          Trusted help,
          <br />
          <span className="whitespace-nowrap">
            right <span className="text-[#1D5CE5]">next door.</span>
          </span>
        </p>

        <VerifyBadge className="mt-5" />

        <div className="auth-shell-aside-image">
          <Image
            src={LIFESTYLE.authCarpet}
            alt="A Bunk helper cleaning a carpet"
            fill
            className="object-cover object-[50%_30%]"
            sizes="360px"
            priority
          />
        </div>

        <ul className="auth-shell-aside-list">
          {BULLETS.map((text) => (
            <li
              key={text}
              className="flex items-start gap-2.5 text-[15px] font-medium leading-[22px] text-[#071330]"
            >
              <svg className="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden>
                <circle cx="10" cy="10" r="9" fill="#EEF4FF" stroke="#1D5CE5" strokeWidth="1.2" />
                <path
                  d="M6.2 10.2l2.3 2.3 5.3-5.4"
                  stroke="#1D5CE5"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

/** Inline verify chip shown when the promo column is hidden. */
export function AuthMobileVerifyBadge({ className = '' }: { className?: string }) {
  return <VerifyBadge className={`auth-shell-mobile-verify ${className}`} />
}
