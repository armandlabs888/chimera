'use client'

import { Outfit } from 'next/font/google'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Search,
  Send,
} from 'lucide-react'
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { PageContainer } from '@/components/PageContainer'
import { Button } from '@/components/ui/button'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { Field, Select, TextArea, TextInput } from '@/components/ui/form'
import { useBeam } from '@/context/BeamContext'
import {
  FORM_SEND_FAILED,
  focusAndScroll,
  formatFormIssues,
  humanizeSaveError,
  scrollAlertIntoView,
} from '@/lib/formErrors'
import { FAQ_ITEMS, FAQ_TABS, type FaqTabId } from '@/lib/support/faq'
import { FEEDBACK_KINDS, SUPPORT_TOPICS } from '@/lib/support/topics'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
})

const FACE_LABELS = ['Terrible', 'Bad', 'Okay', 'Good', 'Great'] as const

function FaceIcon({
  level,
  active,
}: {
  level: 1 | 2 | 3 | 4 | 5
  active: boolean
}) {
  const color = active ? '#1D5CE5' : '#4A5568'
  const mouths: Record<number, string> = {
    1: 'M9 16c1.2-1.5 2.8-2.2 5-2.2s3.8.7 5 2.2',
    2: 'M9 15.5c1-1 2.5-1.5 5-1.5s4 .5 5 1.5',
    3: 'M9 15.5h10',
    4: 'M9 14.5c1 1.2 2.8 2 5 2s4-.8 5-2',
    5: 'M8.5 14c1.2 2.2 3.2 3.4 5.5 3.4S18.3 16.2 19.5 14',
  }
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <circle cx="14" cy="14" r="12" stroke={color} strokeWidth="1.75" />
      <circle cx="10" cy="11" r="1.35" fill={color} />
      <circle cx="18" cy="11" r="1.35" fill={color} />
      <path d={mouths[level]} stroke={color} strokeWidth="1.75" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function Help() {
  const { authUser, currentUser } = useBeam()
  const accountEmail = authUser?.email?.trim() || ''
  const accountName = currentUser?.name?.trim() || ''
  const emailLocked = Boolean(accountEmail)

  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<FaqTabId>('neighbors')
  const [openId, setOpenId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return FAQ_ITEMS.filter((item) => item.tab === tab)
    return FAQ_ITEMS.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q),
    )
  }, [query, tab])

  const searching = query.trim().length > 0

  return (
    <div data-testid="help-page">
      <section className="bg-[#F7F9FC]" data-testid="help-hero">
        <PageContainer className="py-10 sm:py-14">
          <h1
            className={`${outfit.className} text-[clamp(2rem,4.5vw,2.75rem)] font-bold leading-[1.15] tracking-[-0.02em] text-[#071330]`}
          >
            How can we help?
          </h1>
          <p className="mt-3 max-w-[52ch] text-[16px] leading-[1.55] text-[#4A5568] sm:text-[17px]">
            Search common questions, or write to us if you need a hand with a job, your account, or
            verification.
          </p>
          <label className="relative mt-7 block max-w-xl">
            <span className="sr-only">Search questions</span>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#4A5568]"
              strokeWidth={2}
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpenId(null)
              }}
              placeholder="Search questions"
              className="w-full rounded-lg border border-[#D7E0EC] bg-white py-3 pl-11 pr-3.5 text-[16px] text-[#071330] placeholder:text-[#5B6576] outline-none focus:border-[#1D5CE5] sm:text-[15px]"
              data-testid="help-search"
            />
          </label>
        </PageContainer>
      </section>

      <PageContainer className="py-10 sm:py-12" testId="help-faq">
        <h2
          className={`${outfit.className} text-[1.35rem] font-bold tracking-[-0.02em] text-[#071330] sm:text-[1.5rem]`}
        >
          Frequently asked questions
        </h2>

        {!searching ? (
          <div
            className="mt-5 flex flex-wrap gap-2"
            role="tablist"
            aria-label="FAQ topics"
            data-testid="help-faq-tabs"
          >
            {FAQ_TABS.map((t) => {
              const active = t.id === tab
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setTab(t.id)
                    setOpenId(null)
                  }}
                  className={`inline-flex min-h-[40px] items-center rounded-full px-4 text-[14px] font-semibold transition ${
                    active
                      ? 'bg-[#071330] text-white'
                      : 'bg-[#EEF2F7] text-[#071330] hover:bg-[#E3E8EF]'
                  }`}
                  data-testid={`help-faq-tab-${t.id}`}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        ) : (
          <p className="mt-4 text-[14px] text-[#4A5568]" data-testid="help-search-hint">
            Showing matches across all topics
          </p>
        )}

        <ul className="mt-6 divide-y divide-[#E3E8EF] border-y border-[#E3E8EF]" data-testid="help-faq-list">
          {filtered.length === 0 ? (
            <li className="py-6 text-[15px] text-[#4A5568]">No matching questions. Try another search, or write to us below.</li>
          ) : (
            filtered.map((item) => {
              const open = openId === item.id
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-4 py-4 text-left"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : item.id)}
                    data-testid={`help-faq-item-${item.id}`}
                  >
                    <span className="text-[16px] font-semibold leading-snug text-[#071330]">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`mt-0.5 h-5 w-5 shrink-0 text-[#4A5568] transition ${open ? 'rotate-180' : ''}`}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </button>
                  {open ? (
                    <p
                      className="pb-4 pr-8 text-[15px] leading-[1.55] text-[#4A5568]"
                      data-testid={`help-faq-answer-${item.id}`}
                    >
                      {item.answer}
                    </p>
                  ) : null}
                </li>
              )
            })
          )}
        </ul>
      </PageContainer>

      <PageContainer className="pb-14 sm:pb-16">
        <div className="grid gap-6 lg:grid-cols-2" data-testid="help-forms">
          <ContactCard
            defaultName={accountName}
            defaultEmail={accountEmail}
            emailLocked={emailLocked}
          />
          <FeedbackCard />
        </div>
      </PageContainer>
    </div>
  )
}

function ContactCard({
  defaultName,
  defaultEmail,
  emailLocked,
}: {
  defaultName: string
  defaultEmail: string
  emailLocked: boolean
}) {
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [emailDraft, setEmailDraft] = useState<string | null>(null)
  const name = nameDraft ?? defaultName
  const email = emailLocked ? defaultEmail : (emailDraft ?? defaultEmail)
  const [topic, setTopic] = useState('')
  const [jobLink, setJobLink] = useState('')
  const [message, setMessage] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [honeypot, setHoneypot] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    email?: string
    topic?: string
    message?: string
  }>({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const topicRef = useRef<HTMLSelectElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const alertRef = useRef<HTMLDivElement>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const nextErrors: typeof fieldErrors = {}
    const issues: string[] = []
    if (!name.trim()) {
      nextErrors.name = 'Add your name.'
      issues.push('Add your name.')
    }
    if (!email.trim()) {
      nextErrors.email = 'Add your email.'
      issues.push('Add your email.')
    }
    if (!topic) {
      nextErrors.topic = 'Select a topic.'
      issues.push('Select a topic.')
    }
    if (!message.trim()) {
      nextErrors.message = 'Add a message.'
      issues.push('Add a message.')
    }
    if (issues.length) {
      setFieldErrors(nextErrors)
      setError(formatFormIssues(issues))
      const first =
        (!name.trim() && nameRef.current) ||
        (!email.trim() && emailRef.current) ||
        (!topic && topicRef.current) ||
        (!message.trim() && messageRef.current) ||
        null
      focusAndScroll(first)
      scrollAlertIntoView(alertRef.current)
      return
    }

    setFieldErrors({})
    setError(null)
    setLoading(true)
    try {
      const form = new FormData()
      form.set('name', name.trim())
      form.set('email', email.trim())
      form.set('topic', topic)
      form.set('job_link', jobLink.trim())
      form.set('message', message.trim())
      form.set('company_website', honeypot)
      if (screenshot) form.set('screenshot', screenshot)

      const res = await fetch('/api/support/contact', { method: 'POST', body: form })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(humanizeSaveError(data.error, FORM_SEND_FAILED))
        scrollAlertIntoView(alertRef.current)
        return
      }
      setDone(true)
    } catch (err) {
      setError(humanizeSaveError(err, FORM_SEND_FAILED))
      scrollAlertIntoView(alertRef.current)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      className="rounded-lg border border-[#D7E0EC] bg-white p-5 sm:p-6"
      data-testid="help-contact-card"
      aria-labelledby="help-contact-heading"
    >
      <h2
        id="help-contact-heading"
        className={`${outfit.className} text-[1.2rem] font-bold tracking-[-0.02em] text-[#071330]`}
      >
        Contact us
      </h2>

      {done ? (
        <div
          className="mt-5 flex items-start gap-3 rounded-lg border border-[#D7E0EC] bg-[#F7F9FC] px-4 py-4"
          data-testid="help-contact-success"
          role="status"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1E8E3E]/15 text-[#1E8E3E]">
            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          </span>
          <p className="text-[15px] leading-[1.5] text-[#071330]">
            Thanks, we got it. We usually reply within 1 to 2 business days.
          </p>
        </div>
      ) : (
        <form
          className="relative mt-5 space-y-4"
          onSubmit={onSubmit}
          data-testid="help-contact-form"
          noValidate
        >
          <div
            className="flex items-start gap-2.5 rounded-lg border border-[#D7E0EC] bg-white px-3.5 py-3"
            data-testid="help-contact-emergency"
            role="note"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#C62828]" strokeWidth={2.25} aria-hidden />
            <p className="text-[13px] leading-[1.45] text-[#4A5568]">
              If you are in danger, call 911. Use this form for account questions, job issues, and
              safety concerns that are not emergencies.
            </p>
          </div>

          <Field label="Name" required error={fieldErrors.name} errorId="help-contact-name-error">
            <TextInput
              ref={nameRef}
              name="name"
              value={name}
              onChange={(e) => {
                setNameDraft(e.target.value)
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }))
              }}
              autoComplete="name"
              aria-invalid={fieldErrors.name ? true : undefined}
              data-testid="help-contact-name"
            />
          </Field>

          <Field
            label="Email"
            required
            error={fieldErrors.email}
            errorId="help-contact-email-error"
            hint={emailLocked ? 'This is the email on your account.' : undefined}
          >
            <TextInput
              ref={emailRef}
              name="email"
              type="email"
              value={email}
              onChange={(e) => {
                if (!emailLocked) setEmailDraft(e.target.value)
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }))
              }}
              readOnly={emailLocked}
              autoComplete="email"
              aria-invalid={fieldErrors.email ? true : undefined}
              data-testid="help-contact-email"
            />
          </Field>

          <Field label="Topic" required error={fieldErrors.topic} errorId="help-contact-topic-error">
            <Select
              ref={topicRef}
              name="topic"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value)
                if (fieldErrors.topic) setFieldErrors((prev) => ({ ...prev, topic: undefined }))
              }}
              aria-invalid={fieldErrors.topic ? true : undefined}
              data-testid="help-contact-topic"
            >
              <option value="">Select a topic</option>
              {SUPPORT_TOPICS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Link to a job" hint="Optional">
            <TextInput
              name="job_link"
              value={jobLink}
              onChange={(e) => setJobLink(e.target.value)}
              placeholder="Paste a job link"
              data-testid="help-contact-job-link"
            />
          </Field>

          <Field
            label="Message"
            required
            error={fieldErrors.message}
            errorId="help-contact-message-error"
          >
            <TextArea
              ref={messageRef}
              name="message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                if (fieldErrors.message) {
                  setFieldErrors((prev) => ({ ...prev, message: undefined }))
                }
              }}
              rows={5}
              aria-invalid={fieldErrors.message ? true : undefined}
              data-testid="help-contact-message"
            />
          </Field>

          <Field label="Screenshot" hint="Optional. PNG or JPG, up to 5 MB.">
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="block w-full text-[14px] text-[#4A5568] file:mr-3 file:rounded-lg file:border-0 file:bg-[#EEF2F7] file:px-3 file:py-2 file:text-[13px] file:font-semibold file:text-[#071330]"
              onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
              data-testid="help-contact-screenshot"
            />
          </Field>

          {/* Honeypot */}
          <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
            <label>
              Company website
              <input
                type="text"
                name="company_website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </label>
          </div>

          {error ? (
            <FormErrorAlert ref={alertRef} message={error} testId="help-contact-error" />
          ) : null}

          <Button type="submit" loading={loading} data-testid="help-contact-submit">
            {loading ? null : <Send className="h-4 w-4" strokeWidth={2} aria-hidden />}
            Send
          </Button>
        </form>
      )}
    </section>
  )
}

function FeedbackCard() {
  const [rating, setRating] = useState<number | null>(null)
  const [kind, setKind] = useState('')
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [messageError, setMessageError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const alertRef = useRef<HTMLDivElement>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!message.trim()) {
      const msg = 'Add a message.'
      setMessageError(msg)
      setError(msg)
      focusAndScroll(messageRef.current)
      scrollAlertIntoView(alertRef.current)
      return
    }
    setMessageError('')
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/support/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          kind: kind || null,
          message: message.trim(),
          page_path: '/help',
          company_website: honeypot,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(humanizeSaveError(data.error, FORM_SEND_FAILED))
        scrollAlertIntoView(alertRef.current)
        return
      }
      setDone(true)
    } catch (err) {
      setError(humanizeSaveError(err, FORM_SEND_FAILED))
      scrollAlertIntoView(alertRef.current)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      className="rounded-lg border border-[#D7E0EC] bg-[#F7F9FC] p-5 sm:p-6"
      data-testid="help-feedback-card"
      aria-labelledby="help-feedback-heading"
    >
      <h2
        id="help-feedback-heading"
        className={`${outfit.className} text-[1.2rem] font-bold tracking-[-0.02em] text-[#071330]`}
      >
        Share feedback
      </h2>

      {done ? (
        <div
          className="mt-5 flex items-start gap-3 rounded-lg border border-[#D7E0EC] bg-white px-4 py-4"
          data-testid="help-feedback-success"
          role="status"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1E8E3E]/15 text-[#1E8E3E]">
            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          </span>
          <p className="text-[15px] leading-[1.5] text-[#071330]">Thanks for the feedback.</p>
        </div>
      ) : (
        <form
          className="relative mt-5 space-y-4"
          onSubmit={onSubmit}
          data-testid="help-feedback-form"
          noValidate
        >
          <div>
            <p className="type-meta text-beam-muted mb-2">How are we doing?</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Rating" data-testid="help-feedback-faces">
              {([1, 2, 3, 4, 5] as const).map((level) => {
                const active = rating === level
                return (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={FACE_LABELS[level - 1]}
                    onClick={() => setRating(level)}
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-lg border transition ${
                      active
                        ? 'border-[#1D5CE5] bg-white'
                        : 'border-[#D7E0EC] bg-white hover:border-[#1D5CE5]/40'
                    }`}
                    data-testid={`help-feedback-face-${level}`}
                  >
                    <FaceIcon level={level} active={active} />
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="type-meta text-beam-muted mb-2">Type</p>
            <div className="flex flex-wrap gap-2" data-testid="help-feedback-kinds">
              {FEEDBACK_KINDS.map((k) => {
                const active = kind === k.value
                return (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKind(active ? '' : k.value)}
                    className={`inline-flex min-h-[40px] items-center rounded-full px-4 text-[14px] font-semibold transition ${
                      active
                        ? 'bg-[#071330] text-white'
                        : 'border border-[#D7E0EC] bg-white text-[#071330] hover:bg-white'
                    }`}
                    data-testid={`help-feedback-kind-${k.value}`}
                  >
                    {k.label}
                  </button>
                )
              })}
            </div>
          </div>

          <Field
            label="Message"
            required
            error={messageError || undefined}
            errorId="help-feedback-message-error"
          >
            <TextArea
              ref={messageRef}
              name="message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                if (messageError) setMessageError('')
              }}
              rows={4}
              className="bg-white"
              aria-invalid={messageError ? true : undefined}
              data-testid="help-feedback-message"
            />
          </Field>

          <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
            <label>
              Company website
              <input
                type="text"
                name="company_website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </label>
          </div>

          {error ? (
            <FormErrorAlert ref={alertRef} message={error} testId="help-feedback-error" />
          ) : null}

          <Button type="submit" loading={loading} data-testid="help-feedback-submit">
            {loading ? null : <Send className="h-4 w-4" strokeWidth={2} aria-hidden />}
            Send
          </Button>
        </form>
      )}
    </section>
  )
}
