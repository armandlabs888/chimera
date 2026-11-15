import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseLegalMarkdown, type ParsedLegalDoc } from '@/lib/legal/parseLegalMarkdown'

export type LegalDocumentId = 'terms' | 'privacy'

const FILES: Record<LegalDocumentId, string> = {
  terms: 'terms-of-service.md',
  privacy: 'privacy-policy.md',
}

export function loadLegalDocument(id: LegalDocumentId): ParsedLegalDoc {
  const path = join(process.cwd(), 'content', 'legal', FILES[id])
  const source = readFileSync(path, 'utf8')
  return parseLegalMarkdown(source)
}
