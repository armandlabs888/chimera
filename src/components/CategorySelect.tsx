'use client'

import { Check } from 'lucide-react'
import {
  BROWSE_PARENTS,
  OTHER_CUSTOM_MAX,
  type BrowseParentId,
  type ServiceCategoryId,
  defaultServiceForParent,
  parentIdForService,
  servicesForParent,
} from '@/lib/taxonomy'
import { CATEGORY_ICONS, PARENT_ICONS } from '@/lib/categoryIcons'

type Props = {
  /** Selected leaf service (or empty before choice). */
  serviceId: ServiceCategoryId | null
  customLabel: string
  onServiceChange: (id: ServiceCategoryId) => void
  onCustomChange: (value: string) => void
  /** multi = helper skills toggle; single = post/request */
  mode?: 'single' | 'multi'
  selectedSkills?: ServiceCategoryId[]
  onToggleSkill?: (id: ServiceCategoryId) => void
  error?: string
  customError?: string
  testIdPrefix?: string
}

/**
 * Parent → child service picker. Junk Removal / Other are standalone.
 * Other reveals a required free-text field.
 */
export function CategorySelect({
  serviceId,
  customLabel,
  onServiceChange,
  onCustomChange,
  mode = 'single',
  selectedSkills = [],
  onToggleSkill,
  error,
  customError,
  testIdPrefix = 'category',
}: Props) {
  const parentId: BrowseParentId | null = serviceId ? parentIdForService(serviceId) : null
  const showChildren =
    parentId != null && !BROWSE_PARENTS.find((p) => p.id === parentId)?.standalone
  const children = parentId && showChildren ? servicesForParent(parentId) : []
  const showOther =
    mode === 'single'
      ? serviceId === 'other'
      : selectedSkills.includes('other')

  function selectParent(id: BrowseParentId) {
    const next = defaultServiceForParent(id)
    if (mode === 'multi' && onToggleSkill) {
      const parent = BROWSE_PARENTS.find((p) => p.id === id)
      const group = servicesForParent(id)
      // Standalone (Junk / Other): parent click toggles the single skill.
      if (parent?.standalone) {
        onToggleSkill(next)
        return
      }
      // Multi with children: select first child if none in group yet.
      const anyOn = group.some((s) => selectedSkills.includes(s.id))
      if (!anyOn) onToggleSkill(next)
      return
    }
    onServiceChange(next)
    if (next !== 'other') onCustomChange('')
  }

  return (
    <div className="space-y-3" data-testid={`${testIdPrefix}-select`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BROWSE_PARENTS.map((p) => {
          const Icon = PARENT_ICONS[p.id]
          const selected =
            mode === 'single'
              ? parentId === p.id
              : servicesForParent(p.id).some((s) => selectedSkills.includes(s.id))
          return (
            <button
              key={p.id}
              type="button"
              data-testid={`${testIdPrefix}-parent-${p.id}`}
              onClick={() => selectParent(p.id)}
              className={`relative flex flex-col items-start gap-1.5 rounded-xl border px-3 py-3 text-left transition ${
                selected
                  ? 'border-[#1D5CE5] bg-[#F5F9FF]'
                  : 'border-[#E3E8EF] bg-[#F4F8FD] hover:bg-white'
              }`}
            >
              {selected ? (
                <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#1D5CE5] text-white">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
              ) : null}
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E3E8EF] bg-white text-[#1D5CE5]">
                <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
              </span>
              <span className="text-[13.5px] font-semibold text-[#071330]">{p.label}</span>
              <span className="text-[11.5px] leading-snug text-[#48556A]">{p.description}</span>
            </button>
          )
        })}
      </div>

      {showChildren ? (
        <div
          className="rounded-lg border border-[#E2E8F0] bg-white p-3"
          data-testid={`${testIdPrefix}-children`}
        >
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#64748B]">
            Choose a service
          </p>
          <div className="flex flex-wrap gap-2">
            {children.map((c) => {
              const Icon = CATEGORY_ICONS[c.id]
              const on =
                mode === 'single' ? serviceId === c.id : selectedSkills.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  data-testid={`${testIdPrefix}-service-${c.id}`}
                  onClick={() => {
                    if (mode === 'multi' && onToggleSkill) onToggleSkill(c.id)
                    else {
                      onServiceChange(c.id)
                      onCustomChange('')
                    }
                  }}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition ${
                    on
                      ? 'bg-[#1D5CE5] text-white'
                      : 'bg-[#F8FAFC] text-[#475569] ring-1 ring-[#E2E8F0] hover:text-[#071330]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {c.shortLabel}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {showOther ? (
        <div data-testid={`${testIdPrefix}-other-field`}>
          <label
            htmlFor={`${testIdPrefix}-other-input`}
            className="mb-1.5 block text-[13px] font-semibold text-[#475569]"
          >
            Describe the service
          </label>
          <input
            id={`${testIdPrefix}-other-input`}
            data-testid={`${testIdPrefix}-other-input`}
            type="text"
            value={customLabel}
            maxLength={OTHER_CUSTOM_MAX}
            onChange={(e) => onCustomChange(e.target.value.slice(0, OTHER_CUSTOM_MAX))}
            placeholder="e.g. Patio furniture setup"
            className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[14px] text-[#071330] outline-none transition placeholder:text-[#94A3B8] focus-visible:border-[#1D5CE5] focus-visible:ring-4 focus-visible:ring-[#1D5CE5]/15"
            aria-invalid={Boolean(customError) || undefined}
          />
          <p className="mt-1 text-[12px] text-[#64748B]">
            {customLabel.trim().length}/{OTHER_CUSTOM_MAX}
          </p>
          {customError ? (
            <p className="mt-1 rounded-lg border border-[#D7E0EC] bg-[#F5F9FF] px-3 py-2 text-[13px] font-medium text-[#071330]" role="alert">
              {customError}
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-[#D7E0EC] bg-[#F5F9FF] px-3 py-2 text-[13px] font-medium text-[#071330]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
