import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

export function Field({
  label,
  children,
  hint,
  error,
  required,
  errorId,
}: {
  label: string
  children: ReactNode
  hint?: string
  error?: string
  required?: boolean
  errorId?: string
}) {
  return (
    <label className="block space-y-1.5">
      <span className="type-meta text-beam-muted">
        {label}
        {required ? <span className="text-beam-danger"> *</span> : null}
      </span>
      {children}
      {error ? (
        <span id={errorId} className="block type-sec text-beam-danger" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="block type-sec text-beam-muted">{hint}</span>
      ) : null}
    </label>
  )
}

const controlClass =
  'w-full rounded-lg border border-[rgba(7,19,48,0.1)] bg-white px-3.5 py-2 text-[15px] text-[#071330] placeholder:text-[#94A3B8] transition hover:border-[rgba(7,19,48,0.18)] focus:border-[#1D5CE5] focus:outline-none aria-[invalid=true]:border-beam-danger'

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className = '', ...props }, ref) {
    return <input ref={ref} className={`touch-target ${controlClass} ${className}`} {...props} />
  },
)

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className = '', ...props }, ref) {
    return <textarea ref={ref} className={`min-h-24 ${controlClass} ${className}`} {...props} />
  },
)

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`touch-target ${controlClass} ${className}`} {...props}>
      {children}
    </select>
  )
}
