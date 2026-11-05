'use client'

import { Check } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Field, SectionHeader, TextArea, TextInput } from '../components/ui'
import { useBeam } from '../context/BeamContext'
import { CATEGORIES, WHEN_OPTIONS, getCategory } from '../data/categories'
import { NEIGHBORHOODS } from '../data/neighborhoods'
import type { CategoryId, WhenOption } from '../types'

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

  const cat = useMemo(() => getCategory(category), [category])

  function applyTemplate(index: number) {
    const t = cat.templates[index]
    if (!t) return
    setTitle(t.title)
    setDetails(t.details)
    setBudget(t.budgetHint)
    setStep(1)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !details.trim()) {
      setError('Add a title and a few details so helpers know what to expect.')
      return
    }
    if (budget < 10) {
      setError('Budget should be at least $10.')
      return
    }
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
    }
  }

  return (
    <div className="px-4 py-6">
      <SectionHeader
        title="Post a request"
        subtitle="Structured in under a minute — category, when, neighborhood, budget."
      />

      <div className="mb-6 flex gap-2">
        {['Category', 'Details', 'When & pay'].map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={`touch-target flex-1 rounded-xl border px-2 py-2 text-xs font-semibold sm:text-sm ${
              step === i
                ? 'border-beam-amber bg-beam-amber-soft text-beam-amber'
                : 'border-beam-line/70 text-beam-muted'
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
                  category === c.id ? 'ring-beam-amber' : 'ring-transparent hover:bg-white/[0.03]'
                }`}
              >
                <div className="relative h-28">
                  <img src={c.image} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-beam-base via-transparent to-transparent" />
                  {category === c.id ? (
                    <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-beam-amber text-beam-base">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : null}
                </div>
                <div className="px-3 py-3">
                  <p className="font-display text-lg text-beam-cream">{c.label}</p>
                  <p className="text-xs text-beam-muted">{c.description}</p>
                </div>
              </button>
            ))}
          </div>

          <div>
            <h3 className="mb-3 font-display text-xl text-beam-cream">Quick-start templates</h3>
            <div className="space-y-2">
              {cat.templates.map((t, i) => (
                <button
                  key={t.title}
                  type="button"
                  onClick={() => applyTemplate(i)}
                  className="flat-row w-full rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.04]"
                >
                  <p className="font-medium text-beam-cream">{t.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-beam-muted">{t.details}</p>
                </button>
              ))}
            </div>
          </div>

          <Button type="button" className="w-full" onClick={() => setStep(1)}>
            Continue with {cat.shortLabel}
          </Button>
        </div>
      ) : null}

      {step === 1 ? (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            setStep(2)
          }}
        >
          <Field label="Title">
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you need done?"
              required
            />
          </Field>
          <Field label="Details" hint="Be specific about location access, timing, and tools.">
            <TextArea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="A few sentences helpers can trust…"
              required
            />
          </Field>
          <Field label="Neighborhood">
            <select
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value as typeof neighborhood)}
              className="touch-target w-full rounded-xl border border-beam-line/80 bg-beam-ink px-4 py-3 text-beam-cream"
            >
              {NEIGHBORHOODS.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" className="w-full">
            Next: when & budget
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
                  className={`rounded-xl px-4 py-3 text-left ring-1 transition ${
                    when === w.id
                      ? 'bg-beam-amber-soft ring-beam-amber'
                      : 'bg-beam-ink/80 ring-transparent hover:bg-white/[0.03]'
                  }`}
                >
                  <p className="font-semibold text-beam-cream">{w.label}</p>
                  <p className="text-xs text-beam-muted">{w.detail}</p>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Budget (USD)" hint="Helpers name their price in offers — this sets expectations.">
            <TextInput
              type="number"
              min={10}
              step={5}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              required
            />
          </Field>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <Button type="submit" className="w-full">
            Post request
          </Button>
        </form>
      ) : null}
    </div>
  )
}
