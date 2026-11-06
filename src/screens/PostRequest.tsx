'use client'

import { Check } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Badge,
  Button,
  Field,
  InlineBanner,
  SectionHeader,
  Select,
  TextArea,
  TextInput,
} from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { CATEGORIES, WHEN_OPTIONS, getCategory, whenLabel } from '@/data/categories'
import { NEIGHBORHOODS, getNeighborhood } from '@/data/neighborhoods'
import type { CategoryId, WhenOption } from '@/types'

export function PostRequest() {
  const { createRequest, currentUser } = useBeam()
  const router = useRouter()
  const params = useSearchParams()
  const initialCategory = (params.get('category') as CategoryId) || 'moving'

  const [step, setStep] = useState(0)
  const [category, setCategory] = useState<CategoryId>(
    CATEGORIES.some((c) => c.id === initialCategory) ? initialCategory : 'moving',
  )
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [neighborhood, setNeighborhood] = useState(currentUser.neighborhood)
  const [when, setWhen] = useState<WhenOption>('today')
  const [budget, setBudget] = useState(50)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const cat = useMemo(() => getCategory(category), [category])
  const dirty = Boolean(title || details || budget !== 50 || step > 0)

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  function applyTemplate(index: number) {
    const t = cat.templates[index]
    if (!t) return
    setTitle(t.title)
    setDetails(t.details)
    setBudget(t.budgetHint)
    setError('')
    setStep(1)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !details.trim()) {
      setError('Add a title and a few details so helpers know what to expect.')
      setStep(1)
      return
    }
    if (budget < 10) {
      setError('Budget should be at least $10.')
      return
    }
    setPending(true)
    setError('')
    try {
      const request = await createRequest({
        title,
        details,
        category,
        neighborhood,
        when,
        budget,
      })
      router.push(`/requests/${request.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post request')
      setPending(false)
    }
  }

  return (
    <div className="px-4 py-6">
      <SectionHeader
        title="Post a request"
        subtitle="Structured in under a minute — category, when, neighborhood, budget."
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
        <div>
          <div className="mb-6 flex gap-2">
            {['Category', 'Details', 'When & pay'].map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(i)}
                className={`touch-target flex-1 rounded-[10px] border px-2 py-2 text-xs font-semibold sm:text-sm ${
                  step === i
                    ? 'border-beam-amber bg-beam-amber-soft text-beam-amber-deep'
                    : 'border-beam-line text-beam-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {step === 0 ? (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`flat-bento overflow-hidden text-left transition ring-1 ${
                      category === c.id ? 'ring-beam-amber' : 'ring-transparent hover:bg-beam-surface-2'
                    }`}
                  >
                    <div className="relative h-28 bg-beam-surface-2">
                      <img src={c.image} alt="" className="h-full w-full object-cover opacity-90" />
                      <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                      {category === c.id ? (
                        <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-[#D5A455] to-[#B88842] text-[#FDFBF7]">
                          <Check className="h-4 w-4" />
                        </span>
                      ) : null}
                    </div>
                    <div className="px-3 py-3">
                      <p className="text-[16px] font-semibold text-beam-cream">{c.label}</p>
                      <p className="type-sec text-beam-muted">{c.description}</p>
                      {c.id === 'handyman' ? (
                        <p className="mt-1 type-meta text-beam-warning">Excludes licensed trades</p>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>

              <div>
                <h3 className="mb-3 type-h3 text-beam-cream">Quick-start templates</h3>
                <div className="space-y-2">
                  {cat.templates.map((t, i) => (
                    <button
                      key={t.title}
                      type="button"
                      onClick={() => applyTemplate(i)}
                      className="flat-row w-full rounded-[12px] border border-beam-line px-3 py-3 text-left transition hover:bg-beam-surface-2"
                    >
                      <p className="font-medium text-beam-cream">{t.title}</p>
                      <p className="mt-1 line-clamp-2 type-sec text-beam-muted">{t.details}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Button type="button" variant="brand" className="w-full" onClick={() => setStep(1)}>
                Continue with {cat.shortLabel}
              </Button>
            </div>
          ) : null}

          {step === 1 ? (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault()
                if (!title.trim() || !details.trim()) {
                  setError('Add a title and a few details so helpers know what to expect.')
                  return
                }
                setError('')
                setStep(2)
              }}
            >
              <Field label="Title" required error={!title.trim() && error ? error : undefined}>
                <TextInput
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What do you need done?"
                  required
                  aria-invalid={!title.trim() && !!error}
                />
              </Field>
              <Field label="Details" required hint="Be specific about location access, timing, and tools.">
                <TextArea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="A few sentences helpers can trust…"
                  required
                />
              </Field>
              <Field label="Neighborhood">
                <Select
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value as typeof neighborhood)}
                >
                  {NEIGHBORHOODS.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </Select>
              </Field>
              {error ? <InlineBanner tone="error">{error}</InlineBanner> : null}
              <Button type="submit" variant="brand" className="w-full">
                Next: when &amp; budget
              </Button>
            </form>
          ) : null}

          {step === 2 ? (
            <form className="space-y-5" onSubmit={onSubmit}>
              <Field label="When">
                <div className="grid gap-2 sm:grid-cols-2">
                  {WHEN_OPTIONS.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setWhen(w.id)}
                      className={`rounded-[12px] px-4 py-3 text-left ring-1 transition ${
                        when === w.id
                          ? 'bg-beam-amber-soft ring-beam-amber'
                          : 'bg-beam-surface-2 ring-transparent hover:bg-beam-surface-3'
                      }`}
                    >
                      <p className="font-semibold text-beam-cream">{w.label}</p>
                      <p className="type-sec text-beam-muted">{w.detail}</p>
                    </button>
                  ))}
                </div>
              </Field>
              <Field
                label="Budget (USD)"
                hint="Helpers name their price in offers — this sets expectations."
              >
                <TextInput
                  type="number"
                  min={10}
                  step={5}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  required
                  className="tabular-nums"
                />
              </Field>
              {error ? <InlineBanner tone="error">{error}</InlineBanner> : null}
              <Button type="submit" variant="brand" className="w-full" loading={pending}>
                Post request
              </Button>
            </form>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="elevated overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] bg-[#121317] px-4 py-2.5">
              <p className="type-meta text-[#7E7A73]">Live request preview</p>
              <Badge tone="outline">How neighbors see it</Badge>
            </div>
            <div className="p-4">
              <div className="overflow-hidden rounded-[12px] border border-white/[0.08] bg-[#121317]">
                <div className="relative h-28">
                  <img src={cat.image} alt="" className="h-full w-full object-cover opacity-90" />
                  <div className="absolute left-2.5 top-2.5 flex gap-1.5">
                    <Badge tone="brand">{cat.shortLabel}</Badge>
                    <Badge tone="live">Open</Badge>
                  </div>
                </div>
                <div className="space-y-2 bg-[#16181D] p-4">
                  <h3 className="type-intro font-semibold text-[#FAF8F4]">
                    {title.trim() || 'Your request title'}
                  </h3>
                  <p className="line-clamp-3 type-sec text-[#A7A39C]">
                    {details.trim() || 'Details helpers will read before offering a price…'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/[0.1] bg-[#1D2026] px-2 py-0.5 type-meta text-[#A7A39C]">
                      {getNeighborhood(neighborhood).shortName}
                    </span>
                    <span className="rounded-full border border-white/[0.1] bg-[#1D2026] px-2 py-0.5 type-meta text-[#A7A39C]">
                      {whenLabel(when)}
                    </span>
                    <span className="price-pill ml-auto">${budget || 0}</span>
                  </div>
                </div>
              </div>
              <p className="mt-3 type-sec text-[#A7A39C]">
                Preview updates as you edit. Nothing posts until you confirm on step 3.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
