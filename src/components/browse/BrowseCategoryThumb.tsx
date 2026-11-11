'use client'

import { createElement } from 'react'
import { getBrowseCategoryIcon } from '@/lib/categoryIcons'

/** Beam-tint category tile used when a job has no listing photo. */
export function BrowseCategoryThumb({
  categoryId,
  size = 'row',
  className = '',
}: {
  categoryId: string
  size?: 'row' | 'hero'
  className?: string
}) {
  const box =
    size === 'hero'
      ? 'aspect-[16/10] w-full rounded-[10px]'
      : 'h-16 w-16 rounded-[9px] sm:h-[76px] sm:w-[76px] sm:rounded-[10px]'
  const iconClass = size === 'hero' ? 'h-10 w-10' : 'h-7 w-7 sm:h-8 sm:w-8'

  return (
    <span
      className={`grid place-items-center border border-[#D6E2F5] bg-[#F4F8FD] text-[#1D5CE5] ${box} ${className}`}
      aria-hidden
      data-testid="browse-category-thumb"
    >
      {createElement(getBrowseCategoryIcon(categoryId), {
        className: iconClass,
        strokeWidth: 2,
      })}
    </span>
  )
}
