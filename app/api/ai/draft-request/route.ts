import { NextRequest, NextResponse } from 'next/server'
import type { CategoryId, WhenOption } from '@/types'

const BLOCKED_PATTERNS: Array<{ re: RegExp; reason?: string }> = [
  { re: /\b(electrical panel|rewire|wiring|circuit breaker|outlet install)\b/i },
  { re: /\b(gas line|pipe burst|plumbing|toilet install|water heater|sewer)\b/i },
  { re: /\b(hvac|refrigerant|ac unit|furnace|ductwork)\b/i },
  { re: /\b(babysit|babysitting|childcare|nanny|child care)\b/i },
  { re: /\b(nursing|elder care|medical care|injection|iv drip|wound care)\b/i },
  { re: /\b(uber|lyft|airport (ride|pickup|drop)|passenger ride|drive me to)\b/i },
]

const BLOCK_REASON =
  "Beam is for everyday non-licensed local tasks—licensed trades, childcare, medical care, and passenger rides aren't permitted."

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
  for (const p of BLOCKED_PATTERNS) {
    if (p.re.test(prompt)) return BLOCK_REASON
  }
  return null
}

function inferCategory(prompt: string, hint?: CategoryId): CategoryId {
  if (hint) return hint
  const t = prompt.toLowerCase()
  if (/\b(couch|sofa|sectional|u-?haul|boxes|mattress|lift|stairs|move|moving)\b/.test(t))
    return 'moving'
  if (/\b(clean|mop|kitchen|bathroom|move-?out|deep clean|fridge|vacuum|tidy)\b/.test(t))
    return 'cleaning'
  if (/\b(ikea|mount|tv|shelf|dresser|assemble|curtain|handyman|hang|fix)\b/.test(t))
    return 'handyman'
  if (/\b(dog|cat|walk|puppy|pet|feed|litter|sitter)\b/.test(t)) return 'petcare'
  if (/\b(tutor|math|spanish|wifi|wi-?fi|printer|laptop|calculus|python|homework)\b/.test(t))
    return 'tutoring'
  if (/\b(party|photo|headshot|setup|chairs|balloon|event|cater)\b/.test(t)) return 'events'
  return 'handyman'
}

function inferWhen(prompt: string): { when: WhenOption; whenLabel: string } {
  const t = prompt.toLowerCase()
  if (/\b(asap|right away|immediately|urgent|now)\b/.test(t))
    return { when: 'asap', whenLabel: 'ASAP' }
  if (/\b(today|this afternoon|tonight|this evening)\b/.test(t))
    return { when: 'today', whenLabel: 'Today' }
  if (/\b(tomorrow)\b/.test(t)) return { when: 'tomorrow', whenLabel: 'Tomorrow' }
  if (/\b(this week|weekend|saturday|sunday)\b/.test(t))
    return { when: 'this-week', whenLabel: 'This week' }
  return { when: 'today', whenLabel: 'Today' }
}

function estimateBudget(category: CategoryId, prompt: string): {
  suggestedMin: number
  suggestedMax: number
  suggestedBudget: number
} {
  const bases: Record<CategoryId, [number, number]> = {
    moving: [45, 120],
    cleaning: [60, 140],
    handyman: [45, 110],
    petcare: [25, 65],
    tutoring: [35, 85],
    events: [50, 150],
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
    moving: 'Need help moving',
    cleaning: 'Need a home cleaning',
    handyman: 'Need handyman help',
    petcare: 'Need pet care help',
    tutoring: 'Need tutoring / tech help',
    events: 'Need event / photo help',
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

function smartDraft(prompt: string, categoryHint?: CategoryId): DraftResult {
  const category = inferCategory(prompt, categoryHint)
  const { when, whenLabel } = inferWhen(prompt)
  const budget = estimateBudget(category, prompt)
  return {
    category,
    title: synthesizeTitle(category, prompt),
    details: synthesizeDetails(prompt),
    when,
    whenLabel,
    ...budget,
  }
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

  const system = `You are Beam's Smart Task Drafter for a peer-to-peer local help marketplace.
Allowed categories ONLY: moving, cleaning, handyman, petcare, tutoring, events.
Never suggest licensed trades, childcare, medical/elder care, or passenger rides.
Return JSON with keys: category, title (<=70 chars), details, when (asap|today|tomorrow|this-week), whenLabel, suggestedMin, suggestedMax, suggestedBudget.
${hasPhoto ? 'A photo was attached — mention checking the photo in details.' : ''}
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
    return parsed
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
  if (llm && llm.category && llm.title) {
    return NextResponse.json(llm)
  }

  return NextResponse.json(smartDraft(prompt, body.categoryHint))
}
