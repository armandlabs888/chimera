import { NextRequest, NextResponse } from 'next/server'
import { isCategoryId } from '@/lib/taxonomy'
import type { CategoryId, WhenOption } from '@/types'

const BLOCK_REASON =
  "HouseCall is for everyday non-licensed local tasks. Licensed trades, childcare, medical care, and passenger rides aren't permitted."

type DraftResult = {
  blocked?: boolean
  reason?: string
  category?: CategoryId
  title?: string
  details?: string
  when?: WhenOption
  whenLabel?: string
  suggestedMin?: number
  suggestedMax?: number
  suggestedBudget?: number
}

function detectBlocked(prompt: string): string | null {
  const lower = prompt.toLowerCase()
  if (
    /babysitter|babysitting|babysit\b|child\s*care|childcare|\bnanny\b/.test(lower) ||
    /electrical panel|rewire|\bwiring\b|circuit breaker|outlet install/.test(lower) ||
    /gas line|pipe burst|\bplumbing\b|toilet install|water heater|\bsewer\b/.test(lower) ||
    /\bhvac\b|refrigerant|\bac unit\b|\bfurnace\b|ductwork/.test(lower) ||
    /nursing|elder care|medical care|\binjection\b|iv drip|wound care/.test(lower) ||
    /\buber\b|\blyft\b|airport (ride|pickup|drop)|passenger ride|drive me to/.test(lower)
  ) {
    return BLOCK_REASON
  }
  return null
}

function inferCategory(prompt: string, hint?: CategoryId): CategoryId {
  if (hint) return hint
  const t = prompt.toLowerCase()
  if (/\b(carpet|rug|upholstery)\b/.test(t)) return 'carpet-cleaning'
  if (/\b(clean|mop|kitchen|bathroom|move-?out|deep clean|fridge|vacuum|tidy)\b/.test(t))
    return 'house-cleaning'
  if (/\b(car|auto|detail|vehicle|interior wipe|wax)\b/.test(t)) return 'auto-detailing'
  if (/\b(junk|haul|debris|trash haul|couch|sofa|sectional|u-?haul|boxes|mattress|lift|stairs|move|moving)\b/.test(t))
    return 'junk-removal'
  if (/\b(groom|bath|nail trim|brush-out)\b/.test(t)) return 'grooming'
  if (/\b(dog|cat|walk|puppy|pet|feed|litter|sitter)\b/.test(t)) return 'pet-sitting'
  return 'other'
}

function inferWhen(prompt: string): { when: WhenOption; whenLabel: string } {
  const t = prompt.toLowerCase()
  // New post form only accepts asap | scheduled. Mentions of a calendar day → scheduled
  // (customer still picks concrete date/time in the form). Urgency language → asap.
  if (
    /\b(tomorrow|saturday|sunday|monday|tuesday|wednesday|thursday|friday)\b/.test(t) ||
    /\b(next week|this weekend|schedule[d]?|on the \d)/.test(t) ||
    /\b\d{1,2}\/\d{1,2}\b/.test(t)
  ) {
    return { when: 'scheduled', whenLabel: 'Scheduled' }
  }
  return { when: 'asap', whenLabel: 'As soon as possible' }
}

/** Strip removed timing chips (today/tomorrow/this-week) from model output. */
function sanitizeDraftWhen(draft: DraftResult): DraftResult {
  if (draft.when === 'scheduled') {
    return { ...draft, when: 'scheduled', whenLabel: draft.whenLabel || 'Scheduled' }
  }
  // Default + map legacy urgency chips to asap — never reintroduce today/tomorrow/this-week.
  return { ...draft, when: 'asap', whenLabel: 'As soon as possible' }
}

function estimateBudget(category: CategoryId, prompt: string): {
  suggestedMin: number
  suggestedMax: number
  suggestedBudget: number
} {
  const bases: Record<CategoryId, [number, number]> = {
    'house-cleaning': [60, 140],
    'carpet-cleaning': [80, 180],
    'auto-detailing': [75, 200],
    'junk-removal': [60, 250],
    'pet-sitting': [25, 75],
    grooming: [40, 120],
    other: [40, 120],
  }
  let [min, max] = bases[category]
  const t = prompt.toLowerCase()
  if (/\b(2\s*bed|two bed|3rd floor|third floor|heavy|stairs|deep)\b/.test(t)) {
    min = Math.round(min * 1.15)
    max = Math.round(max * 1.25)
  }
  if (/\b(quick|30 min|half hour|small)\b/.test(t)) {
    min = Math.round(min * 0.75)
    max = Math.round(max * 0.8)
  }
  const hours = t.match(/\b(\d+(?:\.\d+)?)\s*hours?\b/)
  if (hours) {
    const h = Number(hours[1])
    min = Math.round(min * Math.max(1, h * 0.7))
    max = Math.round(max * Math.max(1, h * 0.85))
  }
  const suggestedBudget = Math.round((min + max) / 2 / 5) * 5
  return { suggestedMin: min, suggestedMax: max, suggestedBudget }
}

function synthesizeTitle(category: CategoryId, prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= 70) {
    const capped = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    return capped.length > 70 ? capped.slice(0, 67) + '…' : capped
  }
  const labels: Record<CategoryId, string> = {
    'house-cleaning': 'Need house cleaning',
    'carpet-cleaning': 'Need carpet cleaning',
    'auto-detailing': 'Need auto detailing',
    'junk-removal': 'Need junk removal',
    'pet-sitting': 'Need pet sitting',
    grooming: 'Need pet grooming',
    other: 'Need local help',
  }
  const base = labels[category]
  const snippet = cleaned.slice(0, 50).replace(/\s+\S*$/, '')
  const title = `${base}: ${snippet}`
  return title.length > 70 ? title.slice(0, 67) + '…' : title
}

function synthesizeDetails(prompt: string): string {
  const trimmed = prompt.trim()
  const extras: string[] = []
  if (/\bstairs?\b/i.test(trimmed)) extras.push('Includes stairs access.')
  if (/\bfloor\b/i.test(trimmed)) extras.push('Confirm floor / elevator access on arrival.')
  if (/\btools?\b/i.test(trimmed)) extras.push('Bring basic tools if you have them.')
  if (/\bsupplies\b/i.test(trimmed)) extras.push('Confirm who provides supplies.')
  const body = trimmed.endsWith('.') ? trimmed : `${trimmed}.`
  return [body, ...extras].join(' ').slice(0, 1200)
}

/** Strip em (U+2014) and en (U+2013) dashes from model or heuristic draft strings. */
function stripEmEnDashes<T extends DraftResult>(draft: T): T {
  const clean = (value: string | undefined) => {
    if (value == null) return value
    return value
      .replace(/\u2013/g, ' to ')
      .replace(/\u2014/g, '. ')
      .replace(/\s{2,}/g, ' ')
      .replace(/\.\s*\./g, '.')
      .trim()
  }
  return {
    ...draft,
    reason: clean(draft.reason),
    title: clean(draft.title),
    details: clean(draft.details),
    whenLabel: clean(draft.whenLabel),
  }
}

function smartDraft(prompt: string, categoryHint?: CategoryId): DraftResult {
  const category = inferCategory(prompt, categoryHint)
  const { when, whenLabel } = inferWhen(prompt)
  const budget = estimateBudget(category, prompt)
  return stripEmEnDashes(
    sanitizeDraftWhen({
      category,
      title: synthesizeTitle(category, prompt),
      details: synthesizeDetails(prompt),
      when,
      whenLabel,
      ...budget,
    }),
  )
}

async function llmDraft(
  prompt: string,
  hasPhoto: boolean,
  categoryHint?: CategoryId,
): Promise<DraftResult | null> {
  const openaiKey = process.env.OPENAI_API_KEY
  const xaiKey = process.env.XAI_API_KEY
  if (!openaiKey && !xaiKey) return null

  const endpoint = openaiKey
    ? 'https://api.openai.com/v1/chat/completions'
    : 'https://api.x.ai/v1/chat/completions'
  const key = openaiKey || xaiKey!
  const model = openaiKey ? 'gpt-4o-mini' : 'grok-3-mini'

  const system = `You are HouseCall's task drafter for a peer-to-peer local help marketplace.
Allowed categories ONLY: house-cleaning, carpet-cleaning, auto-detailing, junk-removal, pet-sitting, grooming, other.
Never suggest licensed trades, childcare, medical/elder care, or passenger rides. Same exclusions apply when category is other.
Never use em or en dashes.
Return JSON with keys: category, title (<=70 chars), details, when (asap|scheduled ONLY, never today, tomorrow, or this-week), whenLabel, suggestedMin, suggestedMax, suggestedBudget.
Use when=asap when the customer wants help soon / urgently (not a guaranteed dispatch). Use when=scheduled only if they clearly name a future day or appointment.
${hasPhoto ? 'A photo was attached. Mention checking the photo in details.' : ''}
${categoryHint ? `Prefer category ${categoryHint} if it fits.` : ''}`

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) return null
    const parsed = JSON.parse(content) as DraftResult
    return stripEmEnDashes(parsed)
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  let body: { prompt?: string; hasPhoto?: boolean; categoryHint?: CategoryId } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const prompt = (body.prompt ?? '').trim()
  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  }

  const blocked = detectBlocked(prompt)
  if (blocked) {
    return NextResponse.json({ blocked: true, reason: blocked } satisfies DraftResult)
  }

  const llm = await llmDraft(prompt, Boolean(body.hasPhoto), body.categoryHint)
  if (llm && llm.category && isCategoryId(llm.category) && llm.title) {
    return NextResponse.json(stripEmEnDashes(sanitizeDraftWhen(llm)))
  }

  return NextResponse.json(smartDraft(prompt, body.categoryHint))
}
