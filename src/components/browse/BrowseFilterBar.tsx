'use client'

import { Check, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { BROWSE_PARENTS } from '@/lib/taxonomy'
import { useFocusTrap } from './useFocusTrap'

export type FilterOption = { id: string; label: string }

type Panel = 'category' | 'distance' | 'timing' | 'sort' | null

export function BrowseFilterBar({
  tab,
  qDraft,
  onQDraft,
  onClearSearch,
  category,
  categoryLabel,
  categoryCounts,
  onCategory,
  radius,
  radiusOptions,
  onRadius,
  timingLabel,
  timingValue,
  timingOptions,
  onTiming,
  timingTestId,
  sort,
  sortLabel,
  sortOptions,
  onSort,
  chips,
  onReset,
  resultCount,
  resultNoun,
}: {
  tab: 'requests' | 'people'
  qDraft: string
  onQDraft: (value: string) => void
  onClearSearch: () => void
  category: string
  categoryLabel: string | null
  categoryCounts: Record<string, number>
  onCategory: (id: string) => void
  radius: string
  radiusOptions: FilterOption[]
  onRadius: (id: string) => void
  timingLabel: string
  timingValue: string
  timingOptions: FilterOption[]
  onTiming: (id: string) => void
  timingTestId: 'browse-when-trigger' | 'browse-availability-trigger'
  sort: string
  sortLabel: string
  sortOptions: FilterOption[]
  onSort: (id: string) => void
  chips: { id: string; label: string; onRemove: () => void }[]
  onReset: () => void
  resultCount: number
  resultNoun: string
}) {
  const [panel, setPanel] = useState<Panel>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const mobileTriggerRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeSheet = useCallback(() => {
    setMobileOpen(false)
    queueMicrotask(() => mobileTriggerRef.current?.focus())
  }, [])
  useFocusTrap(mobileOpen, sheetRef, closeSheet)

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
    (category !== 'all' ? 1 : 0) +
    (radius !== 'all' ? 1 : 0) +
    (timingValue !== 'all' ? 1 : 0)

  const shortSort = sortLabel.replace(/ first$/, '')
  const timingNoun = tab === 'people' ? 'Availability' : 'When'
  const showLabel = `Show ${resultCount} ${resultNoun}`

  return (
    <div ref={barRef} className="browse-filter-bar mt-7 pt-3 sm:mt-7" data-testid="browse-command-bar">
      <div className="flex items-center gap-2" data-testid="browse-filter-bar">
        <SearchField value={qDraft} onChange={onQDraft} onClear={onClearSearch} />
        <div className="hidden items-center gap-2 sm:flex">
        <FilterPopover
          label={category === 'all' ? 'Category' : categoryLabel || 'Category'}
          active={category !== 'all'}
          count={category !== 'all' ? 1 : 0}
          open={panel === 'category'}
          onToggle={() => toggle('category')}
          testId="browse-category-trigger"
          listboxId="browse-category-listbox"
          align="left"
        >
          <OptionList
            id="browse-category-listbox"
            label="Category"
            options={[{ id: 'all', label: 'All categories', count: categoryCounts.all }, ...BROWSE_PARENTS.map((p) => ({ id: p.id, label: p.shortLabel, count: categoryCounts[p.id] ?? 0 }))]}
            value={category}
            onSelect={(id) => {
              onCategory(id)
            }}
          />
          <PopoverFooter onClear={() => onCategory('all')} action={showLabel} onAction={() => setPanel(null)} />
        </FilterPopover>
        <FilterPopover
          label={radius === 'all' ? 'Distance' : radiusOptions.find((o) => o.id === radius)?.label || 'Distance'}
          active={radius !== 'all'}
          open={panel === 'distance'}
          onToggle={() => toggle('distance')}
          testId="browse-radius-trigger"
          listboxId="browse-radius-listbox"
          align="left"
        >
          <OptionList
            id="browse-radius-listbox"
            label="Distance"
            options={radiusOptions.map((o) => ({ id: o.id, label: o.label }))}
            value={radius}
            onSelect={(id) => {
              onRadius(id)
              setPanel(null)
            }}
          />
        </FilterPopover>
        <FilterPopover
          label={timingValue === 'all' ? timingNoun : timingLabel}
          active={timingValue !== 'all'}
          open={panel === 'timing'}
          onToggle={() => toggle('timing')}
          testId={timingTestId}
          listboxId={tab === 'people' ? 'browse-availability-listbox' : 'browse-when-listbox'}
          align="right"
          srDefault={timingValue === 'all' ? timingLabel : undefined}
        >
          <OptionList
            id={tab === 'people' ? 'browse-availability-listbox' : 'browse-when-listbox'}
            label={timingNoun}
            options={timingOptions}
            value={timingValue}
            onSelect={(id) => {
              onTiming(id)
              setPanel(null)
            }}
          />
        </FilterPopover>
        <span className="mx-0.5 h-[22px] w-px bg-[#E3E8EF]" aria-hidden />
        <FilterPopover
          label={
            <>
              Sort: <b className="font-semibold text-[#071330]">{shortSort}</b>
            </>
          }
          bare
          open={panel === 'sort'}
          onToggle={() => toggle('sort')}
          testId="browse-sort-trigger"
          listboxId="browse-sort-listbox"
          align="right"
          buttonClassName="h-10 gap-1.5 px-1 text-[14px] font-medium text-[#273449]"
        >
          <OptionList
            id="browse-sort-listbox"
            label="Sort"
            options={sortOptions}
            value={sort}
            onSelect={(id) => {
              onSort(id)
              setPanel(null)
            }}
          />
        </FilterPopover>
        </div>
        <button
          ref={mobileTriggerRef}
          type="button"
          data-testid="browse-mobile-filters-trigger"
          aria-expanded={mobileOpen}
          aria-controls="browse-mobile-filters-panel"
          onClick={() => {
            setMobileOpen(true)
            setPanel(null)
          }}
          className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[10px] border px-3 text-[14px] font-medium sm:hidden ${
            mobileOpen || activeFilterCount
              ? 'border-[#1D5CE5] bg-[#F4F8FD] text-[#123E9E]'
              : 'border-[#CDD5E0] bg-white text-[#071330]'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" strokeWidth={1.9} aria-hidden />
          Filters
          {activeFilterCount ? (
            <span className="grid h-[18px] min-w-[18px] place-items-center rounded-[5px] bg-[#1D5CE5] px-1 text-[11px] font-semibold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      {chips.length ? (
        <div className="flex items-center gap-2 overflow-x-auto pt-3 sm:flex-wrap sm:overflow-visible">
          {chips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-lg bg-[#071330] py-0 pl-2.5 pr-1.5 text-[13px] font-medium text-white"
            >
              {chip.label}
              <button
                type="button"
                aria-label={`Remove ${chip.label}`}
                onClick={chip.onRemove}
                className="grid h-5 w-5 place-items-center rounded-[5px] text-[#C9D6EE] hover:bg-white/15 hover:text-white"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.4} />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onReset}
            className="h-[30px] shrink-0 px-1.5 text-[13.5px] font-semibold text-[#1D5CE5] hover:underline"
            data-testid="browse-filters-reset"
          >
            Reset
          </button>
        </div>
      ) : null}
      <div className="mt-3 h-px bg-[#E3E8EF]" />

      {mobileOpen && typeof document !== 'undefined'
        ? createPortal(
        <div className="fixed inset-0 z-[80] sm:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(7,19,48,0.36)]"
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
            className="absolute inset-x-0 bottom-0 top-7 flex flex-col rounded-t-2xl bg-white shadow-[0_-12px_40px_rgba(7,19,48,0.25)] outline-none"
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[#C3CCD9]" aria-hidden />
            <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#E3E8EF] px-2.5 pl-[18px]">
              <span className="text-[16px] font-bold text-[#071330]">Filters</span>
              <button
                type="button"
                aria-label="Close"
                onClick={closeSheet}
                data-testid="browse-mobile-filters-close"
                className="grid h-9 w-9 place-items-center rounded-[9px] text-[#071330] hover:bg-[#F4F8FD]"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-[18px]">
              <SheetGroup title="Category">
                <div className="flex flex-wrap gap-2">
                  <ToggleChip
                    label="All categories"
                    on={category === 'all'}
                    onClick={() => onCategory('all')}
                  />
                  {BROWSE_PARENTS.map((p) => (
                    <ToggleChip
                      key={p.id}
                      label={p.shortLabel}
                      on={category === p.id}
                      onClick={() => onCategory(p.id)}
                    />
                  ))}
                </div>
              </SheetGroup>
              <SheetGroup title="Distance">
                <div className="grid grid-cols-5 overflow-hidden rounded-[10px] border border-[#CDD5E0]">
                  {radiusOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onRadius(opt.id)}
                      className={`h-10 text-[13px] font-medium ${
                        radius === opt.id ? 'bg-[#071330] font-semibold text-white' : 'text-[#071330]'
                      } ${opt.id === radiusOptions[0]?.id ? '' : 'border-l border-[#CDD5E0]'}`}
                    >
                      {opt.id === 'all' ? 'Any' : opt.label.replace('Within ', '').replace(' mi', '')}
                    </button>
                  ))}
                </div>
              </SheetGroup>
              <SheetGroup title={timingNoun}>
                <div className="flex flex-wrap gap-2">
                  {timingOptions.map((opt) => (
                    <ToggleChip
                      key={opt.id}
                      label={opt.label}
                      on={timingValue === opt.id}
                      onClick={() => onTiming(opt.id)}
                    />
                  ))}
                </div>
              </SheetGroup>
              <SheetGroup title="Sort by" last>
                <div className="grid grid-cols-3 overflow-hidden rounded-[10px] border border-[#CDD5E0]">
                  {sortOptions.map((opt, index) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSort(opt.id)}
                      className={`h-10 px-1 text-[13px] font-medium ${
                        sort === opt.id ? 'bg-[#071330] font-semibold text-white' : 'text-[#071330]'
                      } ${index ? 'border-l border-[#CDD5E0]' : ''}`}
                    >
                      {opt.label.replace(' first', '')}
                    </button>
                  ))}
                </div>
              </SheetGroup>
            </div>
            <div className="flex shrink-0 gap-2.5 border-t border-[#E3E8EF] px-4 pb-5 pt-3">
              <button
                type="button"
                onClick={onReset}
                className="inline-flex h-12 w-28 items-center justify-center rounded-[10px] border border-[#CDD5E0] text-[15px] font-semibold text-[#071330]"
                data-testid="browse-mobile-filters-reset"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={closeSheet}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-[10px] bg-[#1D5CE5] text-[15px] font-semibold text-white"
                data-testid="browse-mobile-filters-apply"
              >
                {showLabel}
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

function SearchField({
  value,
  onChange,
  onClear,
}: {
  value: string
  onChange: (value: string) => void
  onClear: () => void
}) {
  return (
    <label className="relative min-w-0 flex-1">
      <span className="sr-only">Search browse</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#3D4A5F]" aria-hidden />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search jobs"
        aria-label="Search browse"
        className="h-10 w-full rounded-[10px] border border-[#CDD5E0] bg-white pl-9 pr-9 text-[14.5px] text-[#071330] outline-none placeholder:text-[#55627A] focus:border-[#1D5CE5] focus:shadow-[0_0_0_3px_rgba(29,92,229,0.14)]"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={onClear}
          className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[#3D4A5F] hover:bg-[#F4F8FD]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </label>
  )
}

function FilterPopover({
  label,
  active = false,
  count = 0,
  open,
  onToggle,
  testId,
  listboxId,
  align,
  bare = false,
  buttonClassName = '',
  srDefault,
  children,
}: {
  label: ReactNode
  active?: boolean
  count?: number
  open: boolean
  onToggle: () => void
  testId: string
  listboxId: string
  align: 'left' | 'right'
  bare?: boolean
  buttonClassName?: string
  srDefault?: string
  children: ReactNode
}) {
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        data-testid={testId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={onToggle}
        className={
          bare
            ? `inline-flex items-center whitespace-nowrap ${buttonClassName}`
            : `inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] border px-3 text-[14px] font-medium ${
                open
                  ? 'border-[#1D5CE5] shadow-[0_0_0_3px_rgba(29,92,229,0.14)]'
                  : active
                    ? 'border-[#1D5CE5] bg-[#F4F8FD] text-[#123E9E]'
                    : 'border-[#CDD5E0] bg-white text-[#071330] hover:border-[#9FB0C7] hover:bg-[#FAFBFD]'
              } ${buttonClassName}`
        }
      >
        {label}
        {srDefault ? <span className="sr-only">{srDefault}</span> : null}
        {count > 0 ? (
          <span className="grid h-[18px] min-w-[18px] place-items-center rounded-[5px] bg-[#1D5CE5] px-1 text-[11px] font-semibold text-white">
            {count}
          </span>
        ) : null}
        <ChevronDown className={`h-[15px] w-[15px] ${active ? 'text-[#1D5CE5]' : 'text-[#3D4A5F]'}`} aria-hidden />
      </button>
      {open ? (
        <div
          className={`absolute top-[calc(100%+8px)] z-[60] w-[300px] max-w-[calc(100vw-2rem)] rounded-xl border border-[#CDD5E0] bg-white p-2 text-left shadow-[0_18px_44px_-12px_rgba(7,19,48,0.28),0_2px_6px_rgba(7,19,48,0.06)] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

function OptionList({
  id,
  label,
  options,
  value,
  onSelect,
}: {
  id: string
  label: string
  options: { id: string; label: string; count?: number }[]
  value: string
  onSelect: (id: string) => void
}) {
  const labelId = useId()
  function onKey(e: ReactKeyboardEvent) {
    const ids = options.map((o) => o.id)
    const idx = Math.max(0, ids.indexOf(value))
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      onSelect(ids[(idx + 1) % ids.length])
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      onSelect(ids[(idx - 1 + ids.length) % ids.length])
    } else if (e.key === 'Home') {
      e.preventDefault()
      onSelect(ids[0])
    } else if (e.key === 'End') {
      e.preventDefault()
      onSelect(ids[ids.length - 1])
    }
  }
  return (
    <div>
      <p id={labelId} className="px-2.5 pb-1.5 pt-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#3D4A5F]">
        {label}
      </p>
      <ul id={id} role="listbox" aria-labelledby={labelId} data-testid={id} onKeyDown={onKey}>
        {options.map((opt) => {
          const selected = value === opt.id
          return (
            <li key={opt.id}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(opt.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14.5px] font-medium text-[#071330] hover:bg-[#F4F8FD]"
              >
                <span
                  className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border ${
                    selected ? 'border-[#1D5CE5] bg-[#1D5CE5] text-white' : 'border-[#8C9AB0]'
                  }`}
                >
                  {selected ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : null}
                </span>
                <span className="min-w-0 flex-1">{opt.label}</span>
                {typeof opt.count === 'number' ? (
                  <span className="text-[13px] font-medium tabular-nums text-[#3D4A5F]">{opt.count}</span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function PopoverFooter({
  onClear,
  action,
  onAction,
}: {
  onClear: () => void
  action: string
  onAction: () => void
}) {
  return (
    <div className="-mx-2 mt-1.5 flex items-center justify-between border-t border-[#E3E8EF] px-2.5 py-2.5 pl-4">
      <button type="button" onClick={onClear} className="text-[14px] font-semibold text-[#071330]">
        Clear
      </button>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex h-10 items-center rounded-[10px] bg-[#1D5CE5] px-4 text-[14px] font-semibold text-white hover:bg-[#1649BD]"
      >
        {action}
      </button>
    </div>
  )
}

function SheetGroup({
  title,
  last = false,
  children,
}: {
  title: string
  last?: boolean
  children: ReactNode
}) {
  return (
    <div className={`py-4 ${last ? '' : 'border-b border-[#E3E8EF]'}`}>
      <h4 className="mb-3 text-[15px] font-bold text-[#071330]">{title}</h4>
      {children}
    </div>
  )
}

function ToggleChip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-[38px] items-center gap-1.5 rounded-[9px] border px-3 text-[14px] ${
        on
          ? 'border-[#1D5CE5] bg-[#F4F8FD] font-semibold text-[#123E9E] shadow-[inset_0_0_0_1px_#1D5CE5]'
          : 'border-[#CDD5E0] font-medium text-[#071330]'
      }`}
    >
      {on ? <Check className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden /> : null}
      {label}
    </button>
  )
}
