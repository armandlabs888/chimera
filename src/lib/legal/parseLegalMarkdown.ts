/**
 * Lightweight markdown parse for BlockSide legal drafts.
 * Supports: H1/H2/H3, bold, lists, tables, soft breaks (\), paragraphs, links.
 */

export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: InlineNode[] }
  | { type: 'link'; href: string; children: InlineNode[] }

export type BlockNode =
  | { type: 'h1'; text: string; children: InlineNode[] }
  | { type: 'h2'; id: string; number: string | null; title: string; children: InlineNode[] }
  | { type: 'h3'; id: string; children: InlineNode[] }
  | { type: 'p'; children: InlineNode[]; conspicuous?: boolean }
  | { type: 'ul'; items: InlineNode[][] }
  | { type: 'table'; headers: InlineNode[][]; rows: InlineNode[][][] }
  | { type: 'meta'; children: InlineNode[] }

export type TocEntry = { id: string; number: string; title: string }

export type ParsedLegalDoc = {
  title: string
  blocks: BlockNode[]
  toc: TocEntry[]
}

function slugifyHeading(raw: string): string {
  const m = raw.match(/^(\d+(?:\.\d+)*)\.\s+(.*)$/)
  if (m) return `section-${m[1].replace(/\./g, '-')}`
  return `section-${raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)}`
}

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = []
  const re =
    /(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))|(https?:\/\/[^\s)<]+)|(www\.[^\s)<]+)/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push({ type: 'text', text: text.slice(last, match.index) })
    }
    const token = match[0]
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push({
        type: 'bold',
        children: parseInline(token.slice(2, -2)),
      })
    } else if (token.startsWith('[') && token.includes('](')) {
      const lm = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (lm) {
        nodes.push({
          type: 'link',
          href: lm[2],
          children: [{ type: 'text', text: lm[1] }],
        })
      } else {
        nodes.push({ type: 'text', text: token })
      }
    } else {
      const href = token.startsWith('http') ? token : `https://${token}`
      nodes.push({
        type: 'link',
        href,
        children: [{ type: 'text', text: token }],
      })
    }
    last = match.index + token.length
  }
  if (last < text.length) {
    nodes.push({ type: 'text', text: text.slice(last) })
  }
  return nodes.length ? nodes : [{ type: 'text', text: '' }]
}

function isConspicuous(text: string): boolean {
  const letters = text.replace(/[^A-Za-z]/g, '')
  if (letters.length < 40) return false
  const upper = letters.replace(/[^A-Z]/g, '').length
  return upper / letters.length >= 0.7
}

function isMetaLine(text: string): boolean {
  return (
    /^\*\*Effective date:\*\*/i.test(text) ||
    /^\*\*Last updated:\*\*/i.test(text) ||
    /^Effective date:/i.test(text) ||
    /^Last updated:/i.test(text)
  )
}

function isSeparatorRow(raw: string): boolean {
  const cells = raw
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim())
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c))
}

function parseTable(lines: string[], start: number): { block: BlockNode; next: number } {
  const rows: string[][] = []
  let i = start
  while (i < lines.length && lines[i].trim().startsWith('|')) {
    const raw = lines[i].trim()
    if (isSeparatorRow(raw)) {
      i += 1
      continue
    }
    const cells = raw
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim())
    if (cells.length) rows.push(cells)
    i += 1
  }
  const [header, ...body] = rows
  return {
    block: {
      type: 'table',
      headers: (header ?? []).map((c) => parseInline(c)),
      rows: body.map((r) => r.map((c) => parseInline(c))),
    },
    next: i,
  }
}

function isBlockStart(t: string): boolean {
  return (
    !t ||
    t.startsWith('#') ||
    t.startsWith('|') ||
    t.startsWith('- ')
  )
}

export function parseLegalMarkdown(source: string): ParsedLegalDoc {
  const normalized = source.replace(/\u2013|\u2014|\u2012|\u2011/g, '-')
  const lines = normalized.replace(/\r\n/g, '\n').split('\n')

  const blocks: BlockNode[] = []
  const toc: TocEntry[] = []
  let title = 'Legal'
  let i = 0

  while (i < lines.length) {
    const trimmed = lines[i].trim()

    if (!trimmed) {
      i += 1
      continue
    }

    if (trimmed.startsWith('# ')) {
      title = trimmed.slice(2).trim()
      blocks.push({ type: 'h1', text: title, children: parseInline(title) })
      i += 1
      continue
    }

    if (trimmed.startsWith('## ')) {
      const raw = trimmed.slice(3).trim()
      const m = raw.match(/^(\d+)\.\s+(.*)$/)
      const id = slugifyHeading(raw)
      const number = m ? m[1] : null
      const sectionTitle = m ? m[2] : raw
      if (number) toc.push({ id, number, title: sectionTitle })
      blocks.push({
        type: 'h2',
        id,
        number,
        title: sectionTitle,
        children: parseInline(raw),
      })
      i += 1
      continue
    }

    if (trimmed.startsWith('### ')) {
      const raw = trimmed.slice(4).trim()
      const id = slugifyHeading(raw)
      blocks.push({ type: 'h3', id, children: parseInline(raw) })
      i += 1
      continue
    }

    if (trimmed.startsWith('|')) {
      const { block, next } = parseTable(lines, i)
      blocks.push(block)
      i = next
      continue
    }

    if (trimmed.startsWith('- ')) {
      const items: InlineNode[][] = []
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(parseInline(lines[i].trim().slice(2)))
        i += 1
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    // Soft-break chain: lines ending with \
    if (trimmed.endsWith('\\')) {
      const softLines: string[] = []
      while (i < lines.length) {
        const t = lines[i].trim()
        if (!t || isBlockStart(t) && !t.endsWith('\\') && softLines.length) break
        if (t.startsWith('#') || t.startsWith('|') || t.startsWith('- ')) break
        if (t.endsWith('\\')) {
          softLines.push(t.slice(0, -1))
          i += 1
          continue
        }
        softLines.push(t)
        i += 1
        break
      }
      if (softLines.every(isMetaLine)) {
        for (const ml of softLines) {
          blocks.push({ type: 'meta', children: parseInline(ml) })
        }
      } else {
        const joined = softLines.join('\n')
        const lineNodes: InlineNode[] = []
        softLines.forEach((seg, idx) => {
          if (idx > 0) lineNodes.push({ type: 'text', text: '\n' })
          lineNodes.push(...parseInline(seg))
        })
        blocks.push({
          type: 'p',
          children: lineNodes,
          conspicuous: isConspicuous(joined),
        })
      }
      continue
    }

    if (isMetaLine(trimmed)) {
      blocks.push({ type: 'meta', children: parseInline(trimmed) })
      i += 1
      continue
    }

    // Single-line paragraph (legal drafts separate with blank lines)
    blocks.push({
      type: 'p',
      children: parseInline(trimmed),
      conspicuous: isConspicuous(trimmed),
    })
    i += 1
  }

  return { title, blocks, toc }
}
