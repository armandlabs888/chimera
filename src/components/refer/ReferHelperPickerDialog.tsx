'use client'

import { Check, Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ReferHelperShareDialog } from '@/components/browse/ReferHelperShareDialog'
import { useBeam } from '@/context/BeamContext'
import { referHelperShareText } from '@/lib/displayTitle'
import {
  buildReferCandidates,
  REFERRAL_NOTE_MAX,
  type ReferHelperCandidate,
} from '@/lib/jobReferrals'
import './refer-helper-picker.css'

export function ReferHelperPickerDialog({
  open,
  onClose,
  jobId,
  jobTitle,
  jobOwnerId,
}: {
  open: boolean
  onClose: () => void
  jobId: string
  jobTitle: string
  jobOwnerId: string
}) {
  const titleId = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  const { state, currentUser, referHelpers } = useBeam()
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [phase, setPhase] = useState<'pick' | 'success'>('pick')
  const [successName, setSuccessName] = useState('Your helper')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [shareOpen, setShareOpen] = useState(false)

  const candidates = useMemo(
    () =>
      buildReferCandidates({
        people: state.people,
        currentUserId: currentUser.id,
        jobOwnerId,
        jobId,
        referrals: state.jobReferrals ?? [],
        threads: state.threads,
        requests: state.requests,
      }),
    [
      state.people,
      state.jobReferrals,
      state.threads,
      state.requests,
      currentUser.id,
      jobOwnerId,
      jobId,
    ],
  )

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelectedIds([])
    setNote('')
    setPhase('pick')
    setError('')
    setSending(false)
    const t = window.setTimeout(() => searchRef.current?.focus(), 40)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (shareOpen) setShareOpen(false)
        else onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose, shareOpen])

  const q = query.trim().toLowerCase()
  const selectedHelpers = useMemo(
    () => candidates.filter((c) => selectedIds.includes(c.id)),
    [candidates, selectedIds],
  )
  const list = useMemo(() => {
    if (q) {
      return candidates.filter((c) => {
        const hay = `${c.name} ${c.skills.join(' ')}`.toLowerCase()
        return hay.includes(q)
      })
    }
    return candidates.filter((c) => c.workedWith)
  }, [candidates, q])
  const listLabel = q ? 'Matching helpers' : "People you've worked with"

  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/requests/${jobId}` : `/requests/${jobId}`

  function toggle(id: string, already: boolean) {
    if (already) return
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function send() {
    if (!selectedIds.length || sending) return
    setSending(true)
    setError('')
    try {
      const first = candidates.find((c) => c.id === selectedIds[0])
      const rows = await referHelpers({
        jobId,
        helperIds: selectedIds,
        note,
      })
      if (!rows.length) {
        setError('Those helpers were already suggested for this job.')
        return
      }
      setSuccessName(first?.name.split(' ')[0] || 'Your helper')
      setPhase('success')
    } catch {
      setError('Could not send suggestions. Try again in a moment.')
    } finally {
      setSending(false)
    }
  }

  if (!open || typeof document === 'undefined') return null

  const sendLabel =
    selectedIds.length === 0
      ? 'Send to helpers'
      : `Send to ${selectedIds.length} helper${selectedIds.length === 1 ? '' : 's'}`

  return createPortal(
    <>
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
                  {query ? (
                    <button
                      type="button"
                      className="rh-picker-search-clear"
                      aria-label="Clear search"
                      data-testid="refer-helper-search-clear"
                      onClick={() => setQuery('')}
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    </button>
                  ) : null}
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
                          onClick={() =>
                            setSelectedIds((prev) => prev.filter((id) => id !== h.id))
                          }
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
                          onToggle={() => toggle(helper.id, helper.alreadySuggested)}
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
                    maxLength={REFERRAL_NOTE_MAX}
                    onChange={(e) => setNote(e.target.value.slice(0, REFERRAL_NOTE_MAX))}
                    placeholder="He fixed my fence, great work"
                    data-testid="refer-helper-note"
                    rows={3}
                  />
                </div>
                {error ? (
                  <p
                    className="mt-3 rounded-[10px] border border-[#D7E0EC] bg-white px-3 py-2 text-[13px] font-semibold text-[#071330]"
                    role="alert"
                    data-testid="refer-helper-error"
                  >
                    {error}
                  </p>
                ) : null}
              </div>

              <div className="rh-picker-footer">
                <button
                  type="button"
                  className="rh-picker-send"
                  disabled={selectedIds.length === 0 || sending}
                  data-testid="refer-helper-send"
                  onClick={() => void send()}
                >
                  {sending ? 'Sending…' : sendLabel}
                </button>
                <button
                  type="button"
                  className="rh-picker-copy-link"
                  data-testid="refer-helper-copy-job-link"
                  onClick={() => setShareOpen(true)}
                >
                  Not on HouseCall yet? Copy job link
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <ReferHelperShareDialog
        open={shareOpen}
        title={jobTitle}
        url={shareUrl}
        shareText={referHelperShareText(jobTitle)}
        onClose={() => setShareOpen(false)}
      />
    </>,
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
  const disabled = helper.alreadySuggested
  return (
    <button
      type="button"
      className={`rh-picker-row${selected ? ' is-selected' : ''}`}
      data-testid={`refer-helper-row-${helper.id}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
      style={disabled ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
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
          {helper.rating > 0 && helper.reviewCount > 0 ? (
            <>
              <span className="rh-picker-stars">★ {helper.rating.toFixed(1)}</span>
              <span aria-hidden>·</span>
              <span>
                {helper.reviewCount} review{helper.reviewCount === 1 ? '' : 's'}
              </span>
            </>
          ) : (
            <span>New</span>
          )}
          {disabled ? (
            <>
              <span aria-hidden>·</span>
              <span data-testid={`refer-helper-already-${helper.id}`}>Already suggested</span>
            </>
          ) : null}
        </span>
      </span>
      <span className="inline-flex items-center">
        <span className="rh-picker-rate">{helper.rateLabel}</span>
        <span className="rh-picker-check" aria-hidden>
          {selected && !disabled ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
        </span>
      </span>
    </button>
  )
}
