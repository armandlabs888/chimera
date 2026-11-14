'use client'

import { Check, ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { FilterOption } from './BrowseFilterBar'

type Panel = 'when' | 'pay' | 'sort' | null

export function BrowseToolsBar({
  qDraft,
  onQDraft,
  onClearSearch,
  whenNoun = 'When',
  whenLabel,
  whenValue,
  whenOptions,
  onWhen,
  payLabel,
  payValue,
  payOptions,
  onPay,
  sortLabel,
  sortValue,
  sortOptions,
  onSort,
  hidePay = false,
}: {
  qDraft: string
  onQDraft: (value: string) => void
  onClearSearch: () => void
  whenNoun?: string
  whenLabel: string
  whenValue: string
  whenOptions: FilterOption[]
  onWhen: (id: string) => void
  payLabel: string
  payValue: string
  payOptions: FilterOption[]
  onPay: (id: string) => void
  sortLabel: string
  sortValue: string
  sortOptions: FilterOption[]
  onSort: (id: string) => void
  hidePay?: boolean
}) {
  const [panel, setPanel] = useState<Panel>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const longPh = 'Search tasks, tools, or neighborhoods (e.g. Niles, blinds, TV)'
  const shortPh = 'Search tasks or neighborhoods'
  const [placeholder, setPlaceholder] = useState(longPh)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)')
    const sync = () => setPlaceholder(mq.matches ? shortPh : longPh)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!barRef.current?.contains(e.target as Node)) setPanel(null)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPanel(null)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  function toggle(next: Panel) {
    setPanel((cur) => (cur === next ? null : next))
  }

  return (
    <div ref={barRef} className="browse-hc-tools" data-testid="browse-command-bar">
      <label className="browse-hc-search" data-testid="browse-filter-bar">
        <Search className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        <input
          type="search"
          value={qDraft}
          onChange={(e) => onQDraft(e.target.value)}
          placeholder={placeholder}
          aria-label="Search tasks"
          data-testid="browse-search"
        />
        {qDraft ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={onClearSearch}
            className="grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center rounded-full text-[#6B7384] hover:bg-[#F4F8FD]"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ) : null}
      </label>

      <div className="browse-hc-tools-filters">
        <FilterSelect
          noun={whenNoun}
          label={whenLabel}
          open={panel === 'when'}
          onToggle={() => toggle('when')}
          options={whenOptions}
          value={whenValue}
          onSelect={(id) => {
            onWhen(id)
            setPanel(null)
          }}
          testId={whenNoun === 'Availability' ? 'browse-availability-trigger' : 'browse-when-trigger'}
          listTestId={
            whenNoun === 'Availability' ? 'browse-availability-listbox' : undefined
          }
        />
        {hidePay ? null : (
          <FilterSelect
            noun="Pay"
            label={payLabel}
            open={panel === 'pay'}
            onToggle={() => toggle('pay')}
            options={payOptions}
            value={payValue}
            onSelect={(id) => {
              onPay(id)
              setPanel(null)
            }}
            testId="browse-pay-trigger"
          />
        )}
        <FilterSelect
          noun="Sort"
          label={sortLabel}
          open={panel === 'sort'}
          onToggle={() => toggle('sort')}
          options={sortOptions}
          value={sortValue}
          onSelect={(id) => {
            onSort(id)
            setPanel(null)
          }}
          testId="browse-sort-trigger"
          listTestId="browse-sort-listbox"
        />
      </div>
    </div>
  )
}

function FilterSelect({
  noun,
  label,
  open,
  onToggle,
  options,
  value,
  onSelect,
  testId,
  listTestId,
}: {
  noun: string
  label: string
  open: boolean
  onToggle: () => void
  options: FilterOption[]
  value: string
  onSelect: (id: string) => void
  testId: string
  listTestId?: string
}) {
  const listId = useId()
  return (
    <div className="relative">
      <button
        type="button"
        className="browse-hc-filter"
        data-testid={testId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={onToggle}
      >
        {noun}: <b>{label}</b>
        <ChevronDown className="chev h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div
          className="browse-hc-filter-menu"
          role="listbox"
          id={listId}
          aria-label={noun}
          data-testid={listTestId}
        >
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="option"
              aria-selected={opt.id === value}
              onClick={() => onSelect(opt.id)}
            >
              <span>{opt.label}</span>
              {opt.id === value ? <Check className="h-4 w-4" strokeWidth={2.25} aria-hidden /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
