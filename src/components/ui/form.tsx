import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function Field({
  label,
  children,
  hint,
  error,
  required,
}: {
  label: string
  children: ReactNode
  hint?: string
  error?: string
  required?: boolean
}) {
  return (
    <label className="block space-y-1.5">
      <span className="type-meta text-beam-muted">
        {label}
        {required ? <span className="text-beam-danger"> *</span> : null}
      </span>
      {children}
      {error ? (
        <span className="block type-sec text-beam-danger" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="block type-sec text-beam-muted">{hint}</span>
      ) : null}
    </label>
  )
}

const controlClass =
  'w-full rounded-[12px] border border-white/[0.12] bg-[#212225]/90 px-3.5 py-2 text-[15px] text-[#F5F2EC] placeholder:text-[#8E8A83] transition hover:border-white/[0.18] focus:border-[#DDA352]/65 focus:outline-none aria-[invalid=true]:border-beam-danger'

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`touch-target ${controlClass} ${className}`} {...props} />
}

export function TextArea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`min-h-24 ${controlClass} ${className}`} {...props} />
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`touch-target ${controlClass} ${className}`} {...props}>
      {children}
    </select>
  )
}
