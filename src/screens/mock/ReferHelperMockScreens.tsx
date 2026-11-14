'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ReferHelperButton } from '@/components/browse/ReferHelperActions'
import { ReferHelperPickerDialog, type ReferPickerMockState } from '@/components/refer/ReferHelperPickerDialog'
import { ReferralInboxCard } from '@/components/refer/ReferralInboxCard'
import { SuggestedHelpersSection } from '@/components/refer/SuggestedHelpersSection'
import { MOCK_REFER_JOB, MOCK_OWNER_SUGGESTIONS } from '@/data/referHelperMock'
import '@/components/browse/browse-hc.css'
import '@/components/account/account-hc.css'
import '@/components/refer/refer-helper-picker.css'

type View = 'picker' | 'inbox' | 'owner' | 'owner-panel' | 'index'

function parseView(raw: string | null): View {
  if (raw === 'picker' || raw === 'inbox' || raw === 'owner' || raw === 'owner-panel') return raw
  return 'index'
}

function parsePickerState(raw: string | null): ReferPickerMockState {
  if (raw === 'search' || raw === 'success') return raw
  return 'default'
}

export function ReferHelperMockScreens() {
  const params = useSearchParams()
  const view = parseView(params.get('view'))
  const pickerState = parsePickerState(params.get('state'))
  const [pickerOpen, setPickerOpen] = useState(view === 'picker')

  const links = useMemo(
    () => [
      { href: '/mock/refer-helper?view=picker&state=default&demo=1', label: 'Picker default' },
      { href: '/mock/refer-helper?view=picker&state=search&demo=1', label: 'Picker search + 2 selected' },
      { href: '/mock/refer-helper?view=picker&state=success&demo=1', label: 'Picker success' },
      { href: '/mock/refer-helper?view=inbox&demo=1', label: 'Helper inbox card' },
      { href: '/mock/refer-helper?view=owner&demo=1', label: 'Owner suggested helpers' },
      { href: '/mock/refer-helper?view=owner-panel&demo=1', label: 'Owner Browse panel' },
    ],
    [],
  )

  return (
    <div className="account-hc min-h-full" data-testid="refer-helper-mock-root" data-view={view}>
      <div className="account-hc-wrap account-hc-page" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <p className="rh-mock-banner" data-testid="refer-helper-mock-banner">
          HouseCall mockup only. Hardcoded demo data. No database writes.
        </p>

        {view === 'index' ? (
          <div>
            <h1 className="account-hc-hero-title" style={{ fontSize: 28 }}>
              Refer a helper mockups
            </h1>
            <p className="account-hc-hero-sub">
              Throwaway screens for the neighbor referral picker, helper inbox card, and owner
              suggestions.
            </p>
            <ul className="mt-6 space-y-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[15px] font-semibold text-[#1D5CE5] hover:text-[#1649BD]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {view === 'picker' ? (
          <div data-testid="refer-helper-mock-picker-stage">
            <h1 className="account-hc-hero-title" style={{ fontSize: 24 }}>
              Neighbor job detail
            </h1>
            <p className="account-hc-hero-sub">{MOCK_REFER_JOB.title}</p>
            <div
              className="mt-6 max-w-md rounded-[14px] border border-[#E3E8EF] bg-white p-5"
              data-testid="refer-helper-mock-job-card"
            >
              <p className="text-[15px] font-bold text-[#071330]">{MOCK_REFER_JOB.title}</p>
              <p className="mt-1 text-[13.5px] text-[#48556A]">
                {MOCK_REFER_JOB.budgetLabel} · {MOCK_REFER_JOB.timingLabel} · {MOCK_REFER_JOB.areaLabel}
              </p>
              <div className="mt-4">
                <ReferHelperButton onClick={() => setPickerOpen(true)} />
                <p className="browse-hc-refer-hint">Know a reliable helper? Send them this job.</p>
              </div>
            </div>
            <ReferHelperPickerDialog
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              jobTitle={MOCK_REFER_JOB.title}
              jobId={MOCK_REFER_JOB.id}
              mockState={pickerState}
            />
          </div>
        ) : null}

        {view === 'inbox' ? (
          <div data-testid="refer-helper-mock-inbox">
            <h1 className="account-hc-hero-title" style={{ fontSize: 24 }}>
              Messages
            </h1>
            <p className="account-hc-hero-sub">What the helper receives after a neighbor referral.</p>
            <div className="rh-inbox-wrap" style={{ marginTop: 16, padding: 0 }}>
              <ReferralInboxCard />
            </div>
          </div>
        ) : null}

        {view === 'owner' ? (
          <div data-testid="refer-helper-mock-owner" className="max-w-xl">
            <h1 className="account-hc-hero-title" style={{ fontSize: 24 }}>
              Your job
            </h1>
            <p className="account-hc-hero-sub">Cat drop-in while at a wedding</p>
            <div className="mt-5 rounded-[14px] border border-[#E3E8EF] bg-white p-5">
              <SuggestedHelpersSection referrals={MOCK_OWNER_SUGGESTIONS} />
            </div>
          </div>
        ) : null}

        {view === 'owner-panel' ? (
          <div data-testid="refer-helper-mock-owner-panel" className="browse-hc">
            <h1 className="account-hc-hero-title" style={{ fontSize: 24 }}>
              Owner job panel
            </h1>
            <p className="account-hc-hero-sub">Browse detail panel style for the job owner.</p>
            <aside
              className="browse-hc-detail mt-5 max-w-md overflow-hidden rounded-[16px] border border-[#E3E8EF] bg-white"
              style={{ display: 'block', position: 'relative', top: 'auto', maxHeight: 'none' }}
              data-testid="mock-owner-browse-panel"
            >
              <div className="browse-hc-detail-body" style={{ padding: 18 }}>
                <h2 className="browse-hc-detail-title" style={{ fontSize: 20 }}>
                  Cat drop-in while at a wedding
                </h2>
                <div className="browse-hc-detail-price-block mt-2">
                  <div className="browse-hc-detail-price">$30</div>
                  <div className="browse-hc-detail-pay">Fixed budget</div>
                </div>
                <SuggestedHelpersSection referrals={MOCK_OWNER_SUGGESTIONS} compact />
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  )
}
