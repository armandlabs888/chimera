import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Car,
  LayoutGrid,
  Home,
  PawPrint,
  Scissors,
  Sparkles,
  SprayCan,
  Trash2,
  Droplets,
  Truck,
  Wrench,
} from 'lucide-react'
import {
  isBrowseParentId,
  isLegacyCategoryId,
  isServiceCategoryId,
  type BrowseParentId,
  type LegacyCategoryId,
  type ServiceCategoryId,
} from '@/lib/taxonomy'

export const CATEGORY_ICONS: Record<ServiceCategoryId, LucideIcon> = {
  'house-cleaning': SprayCan,
  'carpet-cleaning': Droplets,
  'auto-detailing': Car,
  'junk-removal': Trash2,
  'pet-sitting': PawPrint,
  grooming: Scissors,
  other: Sparkles,
}

export const PARENT_ICONS: Record<BrowseParentId, LucideIcon> = {
  home: Home,
  auto: Car,
  'junk-removal': Trash2,
  pets: PawPrint,
  other: Sparkles,
}

const LEGACY_ICONS: Record<LegacyCategoryId, LucideIcon> = {
  moving: Truck,
  cleaning: SprayCan,
  handyman: Wrench,
  petcare: PawPrint,
  tutoring: BookOpen,
  events: Sparkles,
}

export const ALL_CATEGORY_ICON: LucideIcon = LayoutGrid

/** Icon for browse thumbs / drawers — covers launch + legacy + unknown ids. */
export function getBrowseCategoryIcon(categoryId: string | null | undefined): LucideIcon {
  if (!categoryId) return Sparkles
  if (isServiceCategoryId(categoryId)) return CATEGORY_ICONS[categoryId]
  if (isBrowseParentId(categoryId)) return PARENT_ICONS[categoryId]
  if (isLegacyCategoryId(categoryId)) return LEGACY_ICONS[categoryId]
  return Sparkles
}
