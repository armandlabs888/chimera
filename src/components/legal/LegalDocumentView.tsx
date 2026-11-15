import type { ReactNode } from 'react'
import type {
  BlockNode,
  InlineNode,
  ParsedLegalDoc,
  TocEntry,
} from '@/lib/legal/parseLegalMarkdown'

function renderInline(nodes: InlineNode[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${i}`
    if (node.type === 'text') {
      if (node.text.includes('\n')) {
        const parts = node.text.split('\n')
        return parts.map((part, pi) => (
          <span key={`${key}-t${pi}`}>
            {pi > 0 ? <br /> : null}
            {part}
          </span>
        ))
      }
      return <span key={key}>{node.text}</span>
    }
    if (node.type === 'bold') {
      return <strong key={key}>{renderInline(node.children, key)}</strong>
    }
    return (
      <a key={key} href={node.href} className="legal-doc-link">
        {renderInline(node.children, key)}
      </a>
    )
  })
}

function Toc({ entries }: { entries: TocEntry[] }) {
  if (!entries.length) return null
  return (
    <nav className="legal-doc-toc" aria-label="Table of contents">
      <p className="legal-doc-toc-label">Contents</p>
      <ol className="legal-doc-toc-list">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a href={`#${entry.id}`} className="legal-doc-link">
              <span className="legal-doc-toc-num">{entry.number}.</span> {entry.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

function renderBlock(block: BlockNode, index: number): ReactNode {
  const key = `b-${index}`
  switch (block.type) {
    case 'h1':
      return (
        <h1 key={key} className="legal-doc-title">
          {renderInline(block.children, key)}
        </h1>
      )
    case 'h2':
      return (
        <h2 key={key} id={block.id} className="legal-doc-h2">
          {renderInline(block.children, key)}
        </h2>
      )
    case 'h3':
      return (
        <h3 key={key} id={block.id} className="legal-doc-h3">
          {renderInline(block.children, key)}
        </h3>
      )
    case 'meta':
      return (
        <p key={key} className="legal-doc-meta">
          {renderInline(block.children, key)}
        </p>
      )
    case 'p':
      return (
        <p
          key={key}
          className={block.conspicuous ? 'legal-doc-p legal-doc-conspicuous' : 'legal-doc-p'}
        >
          {renderInline(block.children, key)}
        </p>
      )
    case 'ul':
      return (
        <ul key={key} className="legal-doc-ul">
          {block.items.map((item, ii) => (
            <li key={`${key}-li-${ii}`}>{renderInline(item, `${key}-li-${ii}`)}</li>
          ))}
        </ul>
      )
    case 'table':
      return (
        <div key={key} className="legal-doc-table-wrap">
          <table className="legal-doc-table">
            <thead>
              <tr>
                {block.headers.map((cell, ci) => (
                  <th key={`${key}-th-${ci}`}>{renderInline(cell, `${key}-th-${ci}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={`${key}-tr-${ri}`}>
                  {row.map((cell, ci) => (
                    <td key={`${key}-td-${ri}-${ci}`}>
                      {renderInline(cell, `${key}-td-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    default:
      return null
  }
}

export function LegalDocumentView({ doc }: { doc: ParsedLegalDoc }) {
  const bodyBlocks = doc.blocks.filter((b) => b.type !== 'h1')
  const titleBlock = doc.blocks.find((b) => b.type === 'h1')
  const metaBlocks = bodyBlocks.filter((b) => b.type === 'meta')
  const rest = bodyBlocks.filter((b) => b.type !== 'meta')

  // Insert TOC after meta lines / before first content block (after conspicuous notice if present).
  // Place TOC after leading conspicuous notice paragraphs that appear before section 1.
  let tocInsertAt = 0
  while (tocInsertAt < rest.length) {
    const b = rest[tocInsertAt]
    if (b.type === 'p' && (b.conspicuous || tocInsertAt === 0)) {
      // Keep intro paragraphs before ## 1; stop before first h2
      tocInsertAt += 1
      continue
    }
    if (b.type === 'p' && rest.slice(0, tocInsertAt + 1).every((x) => x.type === 'p')) {
      tocInsertAt += 1
      continue
    }
    break
  }
  // Prefer inserting right before the first h2
  const firstH2 = rest.findIndex((b) => b.type === 'h2')
  const insertAt = firstH2 >= 0 ? firstH2 : tocInsertAt

  const before = rest.slice(0, insertAt)
  const after = rest.slice(insertAt)

  return (
    <article className="legal-doc">
      {titleBlock ? renderBlock(titleBlock, 0) : (
        <h1 className="legal-doc-title">{doc.title}</h1>
      )}
      {metaBlocks.map((b, i) => renderBlock(b, i + 1))}
      {before.map((b, i) => renderBlock(b, i + 100))}
      <Toc entries={doc.toc} />
      {after.map((b, i) => renderBlock(b, i + 1000))}
    </article>
  )
}
