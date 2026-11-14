'use client'

import { Check, Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  MOCK_REFER_HELPERS,
  rateLabelFor,
  type ReferHelperCandidate,
} from '@/data/referHelperMock'
import './refer-helper-picker.css'

export type ReferPickerMockState = 'default' | 'search' | 'success'

export function ReferHelperPickerDialog({
  open,
  onClose,
  jobTitle,
  jobId,
  helpers = MOCK_REFER_HELPERS,
  mockState,
  onCopyJobLink,
}: {
  open: boolean
  onClose: () => void
  jobTitle: string
  jobId: string
  helpers?: ReferHelperCandidate[]
  /** Force a screenshot state without interaction. */
  mockState?: ReferPickerMockState
  onCopyJobLink?: () => void
}) {
  const titleId = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [phase, setPhase] = useState<'pick' | 'success'>('pick')
  const [toast, setToast] = useState('')
  const [successName, setSuccessName] = useState('Maya')

  useEffect(() => {
    if (!open) return
    if (mockState === 'search') {
      // "m" matches Maya + Sam so both selected rows stay visible in results.
      setQuery('m')
      setSelectedIds(['p-maya', 'p-sam'])
      setNote('He fixed my fence, great work')
      setPhase('pick')
      setSuccessName('Maya')
      return
    }
    if (mockState === 'success') {
      setQuery('')
      setSelectedIds(['p-maya'])
      setNote('He fixed my fence, great work')
      setPhase('success')
      setSuccessName('Maya')
      return
    }
    setQuery('')
    setSelectedIds([])
    setNote('')
    setPhase('pick')
    setSuccessName('Maya')
  }, [open, mockState])

  useEffect(() => {
    if (!open || phase !== 'pick' || mockState) return
    const t = window.setTimeout(() => searchRef.current?.focus(), 40)
    return () => window.clearTimeout(t)
  }, [open, phase, mockState])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 1600)
    return () => window.clearTimeout(t)
  }, [toast])

  const q = query.trim().toLowerCase()
  const workedWith = useMemo(() => helpers.filter((h) => h.workedWith), [helpers])
  const matching = useMemo(() => {
    if (!q) return []
    return helpers.filter((h) => {
      const hay = `${h.name} ${h.skills.join(' ')}`.toLowerCase()
      return hay.includes(q)
    })
  }, [helpers, q])

  const selectedHelpers = useMemo(
    () => helpers.filter((h) => selectedIds.includes(h.id)),
    [helpers, selectedIds],
  )

  const listLabel = q ? 'Matching helpers' : "People you've worked with"
  const list = q ? matching : workedWith

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function removeChip(id: string) {
    setSelectedIds((prev) => prev.filter((x) => x !== id))
  }

  async function copyJobLink() {
    if (onCopyJobLink) {
      onCopyJobLink()
      return
    }
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/requests/${jobId}`
        : `/requests/${jobId}`
    try {
      await navigator.clipboard.writeText(url)
      setToast('Job link copied')
    } catch {
      setToast('Could not copy link')
    }
  }

  function send() {
    if (!selectedIds.length) return
    const first = helpers.find((h) => h.id === selectedIds[0])
    const firstName = first?.name.split(' ')[0] || 'Your helper'
    setSuccessName(firstName)
    setPhase('success')
  }

  if (!open || typeof document === 'undefined') return null

  const sendLabel =
    selectedIds.length === 0
      ? 'Send to helpers'
      : `Send to ${selectedIds.length} helper${selectedIds.length === 1 ? '' : 's'}`

  return createPortal(
    <div
      className="rh-picker-overlay"
      role="presentation"
      data-testid="refer-helper-picker-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="rh-picker-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="refer-helper-picker"
        data-phase={phase}
      >
        {phase === 'success' ? (
          <div className="rh-picker-success" data-testid="refer-helper-success">
            <div className="rh-picker-success-mark" aria-hidden>
              ✓
            </div>
            <h2 id={titleId}>
              Sent. {successName} will see your suggestion.
            </h2>
            <div className="rh-picker-footer" style={{ borderTop: 0, paddingTop: 20 }}>
              <button
                type="button"
                className="rh-picker-send"
                data-testid="refer-helper-success-done"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="rh-picker-head" style={{ position: 'relative' }}>
              <h2 id={titleId}>Refer a helper</h2>
              <p className="rh-picker-sub" data-testid="refer-helper-job-title">
                {jobTitle}
              </p>
              <button
                type="button"
                className="rh-picker-close"
                aria-label="Close"
                data-testid="refer-helper-picker-close"
                onClick={onClose}
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden />
              </button>
            </div>

            <div className="rh-picker-body">
              <div className="rh-picker-search">
                <Search className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search helpers by name"
                  aria-label="Search helpers by name"
                  data-testid="refer-helper-search"
                  autoComplete="off"
                />
              </div>

              {selectedHelpers.length > 0 ? (
                <div className="rh-picker-chips" data-testid="refer-helper-chips">
                  {selectedHelpers.map((h) => (
                    <span key={h.id} className="rh-picker-chip">
                      {h.name.split(' ')[0]}
                      <button
                        type="button"
                        aria-label={`Remove ${h.name}`}
                        data-testid={`refer-helper-chip-remove-${h.id}`}
                        onClick={() => removeChip(h.id)}
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              <p className="rh-picker-section-label">{listLabel}</p>
              {list.length === 0 ? (
                <div className="rh-picker-empty" data-testid="refer-helper-empty">
                  {q
                    ? 'No helpers match that name yet.'
                    : 'Helpers you message or hire will show up here.'}
                </div>
              ) : (
                <ul className="rh-picker-list" data-testid="refer-helper-list">
                  {list.map((helper) => (
                    <li key={helper.id}>
                      <HelperPickRow
                        helper={helper}
                        selected={selectedIds.includes(helper.id)}
                        onToggle={() => toggle(helper.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}

              <div className="rh-picker-note">
                <label htmlFor="refer-helper-note">Add a note (optional)</label>
                <textarea
                  id="refer-helper-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="He fixed my fence, great work"
                  data-testid="refer-helper-note"
                  rows={3}
                />
              </div>
            </div>

            <div className="rh-picker-footer">
              <button
                type="button"
                className="rh-picker-send"
                disabled={selectedIds.length === 0}
                data-testid="refer-helper-send"
                onClick={send}
              >
                {sendLabel}
              </button>
              <button
                type="button"
                className="rh-picker-copy-link"
                data-testid="refer-helper-copy-job-link"
                onClick={() => void copyJobLink()}
              >
                Not on HouseCall yet? Copy job link
              </button>
            </div>
          </>
        )}
      </div>
      {toast ? (
        <div className="rh-picker-toast" role="status" data-testid="refer-helper-picker-toast">
          {toast}
        </div>
      ) : null}
    </div>,
    document.body,
  )
}

function HelperPickRow({
  helper,
  selected,
  onToggle,
}: {
  helper: ReferHelperCandidate
  selected: boolean
  onToggle: () => void
}) {
  const skills = helper.skills.slice(0, 2).join(' · ')
  const rate = rateLabelFor(helper)
  return (
    <button
      type="button"
      className={`rh-picker-row${selected ? ' is-selected' : ''}`}
      data-testid={`refer-helper-row-${helper.id}`}
      aria-pressed={selected}
      onClick={onToggle}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={helper.avatar}
        alt=""
        width={48}
        height={48}
        className="rh-picker-row-photo"
      />
      <span>
        <span className="rh-picker-row-name">{helper.name}</span>
        <span className="rh-picker-row-skills">{skills}</span>
        <span className="rh-picker-row-meta">
          <span className="rh-picker-stars">★ {helper.rating.toFixed(1)}</span>
          <span aria-hidden>·</span>
          <span>{helper.reviewCount} reviews</span>
        </span>
      </span>
      <span className="inline-flex items-center">
        <span className="rh-picker-rate">{rate}</span>
        <span className="rh-picker-check" aria-hidden>
          {selected ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
        </span>
      </span>
    </button>
  )
}
