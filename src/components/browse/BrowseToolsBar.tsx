'use client'

import { Check, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import type { FilterOption } from './BrowseFilterBar'
import { useFocusTrap } from './useFocusTrap'

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
  const [mobileOpen, setMobileOpen] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const mobileTriggerRef = useRef<HTMLButtonElement>(null)
  const longPh = 'Search tasks, tools, or neighborhoods (e.g. Niles, blinds, TV)'
  const shortPh = 'Search tasks or neighborhoods'
  const [placeholder, setPlaceholder] = useState(longPh)

  const closeSheet = useCallback(() => {
    setMobileOpen(false)
    queueMicrotask(() => mobileTriggerRef.current?.focus())
  }, [])
  useFocusTrap(mobileOpen, sheetRef, closeSheet)

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

  const activeFilterCount =
    (whenValue !== 'all' ? 1 : 0) +
    (!hidePay && payValue !== 'all' ? 1 : 0) +
    (sortValue !== 'nearest' && sortValue !== 'newest' ? 1 : 0)

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
            className="touch-press grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center rounded-full text-[#4A5568]"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ) : null}
      </label>

      <div className="browse-hc-tools-filters hidden sm:flex">
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

      <button
        ref={mobileTriggerRef}
        type="button"
        data-testid="browse-mobile-filters-trigger"
        aria-expanded={mobileOpen}
        aria-controls="browse-mobile-filters-panel"
        onClick={() => setMobileOpen(true)}
        className={`touch-press inline-flex h-11 min-h-[44px] shrink-0 items-center gap-1.5 rounded-[10px] border px-3 text-[14px] font-medium sm:hidden ${
          activeFilterCount > 0 || mobileOpen
            ? 'border-[#1D5CE5] bg-white text-[#123E9E]'
            : 'border-[#D7E0EC] bg-white text-[#071330]'
        }`}
      >
        <SlidersHorizontal className="h-4 w-4" strokeWidth={2} aria-hidden />
        Filters
        {activeFilterCount > 0 ? (
          <span className="grid h-[18px] min-w-[18px] place-items-center rounded-[5px] bg-[#1D5CE5] px-1 text-[11px] font-semibold text-white">
            {activeFilterCount}
          </span>
        ) : null}
      </button>

      {mobileOpen && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[80] sm:hidden">
              <button
                type="button"
                className="bunk-sheet-scrim absolute inset-0 bg-[rgba(7,19,48,0.36)]"
                aria-label="Dismiss filters"
                onClick={closeSheet}
              />
              <div
                ref={sheetRef}
                id="browse-mobile-filters-panel"
                role="dialog"
                aria-modal="true"
                aria-label="Filters"
                tabIndex={-1}
                data-testid="browse-mobile-filters-panel"
                className="bunk-bottom-sheet absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-2xl bg-white outline-none"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              >
                <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[#C3CCD9]" aria-hidden />
                <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#E3E8EF] px-2 pl-[18px]">
                  <span className="text-[16px] font-bold text-[#071330]">Filters</span>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={closeSheet}
                    data-testid="browse-mobile-filters-close"
                    className="touch-press grid h-11 w-11 place-items-center rounded-lg text-[#071330]"
                  >
                    <X className="h-[18px] w-[18px]" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-[18px] py-4">
                  <SheetGroup title={whenNoun}>
                    <ChipRow
                      options={whenOptions}
                      value={whenValue}
                      onSelect={onWhen}
                      testId="browse-mobile-when-options"
                    />
                  </SheetGroup>
                  {hidePay ? null : (
                    <SheetGroup title="Pay">
                      <ChipRow
                        options={payOptions}
                        value={payValue}
                        onSelect={onPay}
                        testId="browse-mobile-pay-options"
                      />
                    </SheetGroup>
                  )}
                  <SheetGroup title="Sort" last>
                    <ChipRow
                      options={sortOptions}
                      value={sortValue}
                      onSelect={onSort}
                      testId="browse-mobile-sort-options"
                    />
                  </SheetGroup>
                </div>
                <div className="flex shrink-0 gap-2.5 border-t border-[#E3E8EF] px-4 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      onWhen('all')
                      if (!hidePay) onPay('all')
                      onSort(sortOptions[0]?.id ?? 'nearest')
                    }}
                    className="touch-press inline-flex h-12 w-28 items-center justify-center rounded-[10px] border border-[#D7E0EC] text-[15px] font-semibold text-[#071330]"
                    data-testid="browse-mobile-filters-reset"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={closeSheet}
                    className="touch-press inline-flex h-12 flex-1 items-center justify-center rounded-[10px] bg-[#1D5CE5] text-[15px] font-semibold text-white"
                    data-testid="browse-mobile-filters-apply"
                  >
                    Show results
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

function SheetGroup({
  title,
  children,
  last = false,
}: {
  title: string
  children: ReactNode
  last?: boolean
}) {
  return (
    <div className={last ? 'pb-2' : 'mb-5 border-b border-[#E3E8EF] pb-5'}>
      <h4 className="mb-3 text-[15px] font-bold text-[#071330]">{title}</h4>
      {children}
    </div>
  )
}

function ChipRow({
  options,
  value,
  onSelect,
  testId,
}: {
  options: FilterOption[]
  value: string
  onSelect: (id: string) => void
  testId: string
}) {
  return (
    <div className="flex flex-wrap gap-2" data-testid={testId}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onSelect(opt.id)}
          className={`touch-press inline-flex min-h-11 items-center rounded-[9px] border px-3 text-[14px] font-medium ${
            opt.id === value
              ? 'border-[#1D5CE5] bg-[#1D5CE5] text-white'
              : 'border-[#D7E0EC] bg-white text-[#071330]'
          }`}
        >
          {opt.label}
        </button>
      ))}
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
