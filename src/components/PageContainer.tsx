import type { ReactNode } from 'react'

/**
 * Shared app shell content width. Matches Browse header/body
 * (`.browse-hc-wrap`) and account pages (`.account-hc-wrap`).
 */
export function PageContainer({
  children,
  className = '',
  as: Tag = 'div',
  testId,
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'main'
  testId?: string
}) {
  const classes = className ? `beam-container ${className}` : 'beam-container'
  return (
    <Tag className={classes} data-testid={testId}>
      {children}
    </Tag>
  )
}
