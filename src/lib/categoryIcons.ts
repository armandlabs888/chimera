import type { LucideIcon } from 'lucide-react'
import {
  Car,
  LayoutGrid,
  Home,
  PawPrint,
  Scissors,
  SprayCan,
  Trash2,
  Droplets,
  MoreHorizontal,
} from 'lucide-react'
import type { BrowseParentId, ServiceCategoryId } from '@/lib/taxonomy'

export const CATEGORY_ICONS: Record<ServiceCategoryId, LucideIcon> = {
  'house-cleaning': SprayCan,
  'carpet-cleaning': Droplets,
  'auto-detailing': Car,
  'junk-removal': Trash2,
  'pet-sitting': PawPrint,
  grooming: Scissors,
  other: MoreHorizontal,
}

export const PARENT_ICONS: Record<BrowseParentId, LucideIcon> = {
  home: Home,
  auto: Car,
  'junk-removal': Trash2,
  pets: PawPrint,
  other: MoreHorizontal,
}

export const ALL_CATEGORY_ICON: LucideIcon = LayoutGrid
