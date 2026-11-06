import type { LucideIcon } from 'lucide-react'
import {
  GraduationCap,
  LayoutGrid,
  PartyPopper,
  PawPrint,
  Sofa,
  SprayCan,
  Wrench,
} from 'lucide-react'
import type { CategoryId } from '@/types'

export const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  moving: Sofa,
  cleaning: SprayCan,
  handyman: Wrench,
  petcare: PawPrint,
  tutoring: GraduationCap,
  events: PartyPopper,
}

export const ALL_CATEGORY_ICON: LucideIcon = LayoutGrid
