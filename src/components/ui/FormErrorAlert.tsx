'use client'

import { forwardRef, type ReactNode } from 'react'
import { formatFormIssues } from '@/lib/formErrors'

export const formErrorAlertClass =
  'rounded-lg border border-[#C62828] bg-[#FEF2F2] px-3.5 py-2.5 text-[13.5px] font-medium leading-[1.45] text-[#C62828]'

export const fieldInlineErrorClass =
  'mt-2 block text-[13px] font-medium leading-[1.45] text-[#C62828]'

/** Red border utility for invalid inputs (compose with existing input classes). */
export const fieldInvalidClass = 'is-error'

type FormErrorAlertProps = {
  /** Single message, or omit when passing `issues`. */
  message?: string
  /** Multiple fix-it lines; joined into plain sentences. */
  issues?: string[]
  className?: string
  testId?: string
  children?: ReactNode
}

/**
 * Submit-adjacent (or top-of-form) error alert.
 * Light red surface, role=alert, so a failed save is never silent.
 */
export const FormErrorAlert = forwardRef<HTMLDivElement, FormErrorAlertProps>(
  function FormErrorAlert(
    { message, issues, className = '', testId, children },
    ref,
  ) {
    const fromIssues = issues?.length ? formatFormIssues(issues) : ''
    const text = (message?.trim() || fromIssues || '').trim()
    if (!text && !children) return null

    return (
      <div
        ref={ref}
        className={`${formErrorAlertClass} ${className}`.trim()}
        role="alert"
        aria-live="assertive"
        data-testid={testId}
      >
        {children ?? text}
      </div>
    )
  },
)

/** Inline message directly under a field. */
export function FieldInlineError({
  id,
  children,
  className = '',
  testId,
}: {
  id?: string
  children: ReactNode
  className?: string
  testId?: string
}) {
  if (!children) return null
  return (
    <p
      id={id}
      className={`${fieldInlineErrorClass} ${className}`.trim()}
      role="alert"
      data-testid={testId}
    >
      {children}
    </p>
  )
}
