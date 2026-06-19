import type { LucideIcon } from 'lucide-react'
import {
  BookMarked,
  BookOpen,
  Bookmark,
  Brain,
  Calendar,
  Clock,
  Compass,
  Contact,
  Crown,
  Drama,
  Eye,
  Feather,
  FileText,
  Flag,
  Flame,
  Folder,
  FolderOpen,
  Gem,
  Globe,
  Heart,
  History,
  Landmark,
  Layers,
  List,
  ListTree,
  Map,
  MapPin,
  PenLine,
  Scroll,
  ScrollText,
  Shield,
  Sparkles,
  Star,
  Sword,
  Target,
  User,
  UserCircle,
  Users,
  Zap,
} from 'lucide-react'

import { cn } from '@/lib/utils'

/** Lucide icon names allowed in memory node style.icon — sync with Python VALID_MEMORY_ICONS. */
export const MEMORY_NODE_ICON_NAMES = [
  'BookMarked',
  'BookOpen',
  'Bookmark',
  'Brain',
  'Calendar',
  'Clock',
  'Compass',
  'Contact',
  'Crown',
  'Drama',
  'Eye',
  'Feather',
  'FileText',
  'Flag',
  'Flame',
  'Folder',
  'FolderOpen',
  'Gem',
  'Globe',
  'Heart',
  'History',
  'Landmark',
  'Layers',
  'List',
  'ListTree',
  'Map',
  'MapPin',
  'PenLine',
  'Scroll',
  'ScrollText',
  'Shield',
  'Sparkles',
  'Star',
  'Sword',
  'Target',
  'User',
  'UserCircle',
  'Users',
  'Zap',
] as const

export type MemoryNodeIconName = (typeof MEMORY_NODE_ICON_NAMES)[number]

const MEMORY_NODE_ICONS: Record<MemoryNodeIconName, LucideIcon> = {
  BookMarked,
  BookOpen,
  Bookmark,
  Brain,
  Calendar,
  Clock,
  Compass,
  Contact,
  Crown,
  Drama,
  Eye,
  Feather,
  FileText,
  Flag,
  Flame,
  Folder,
  FolderOpen,
  Gem,
  Globe,
  Heart,
  History,
  Landmark,
  Layers,
  List,
  ListTree,
  Map,
  MapPin,
  PenLine,
  Scroll,
  ScrollText,
  Shield,
  Sparkles,
  Star,
  Sword,
  Target,
  User,
  UserCircle,
  Users,
  Zap,
}

const ICON_NAME_SET = new Set<string>(MEMORY_NODE_ICON_NAMES)

/** PascalCase / kebab-case → validated Lucide name, or null. Rejects emoji and CJK. */
export function normalizeMemoryIconName(raw?: string | null): MemoryNodeIconName | null {
  const text = (raw ?? '').trim()
  if (!text || !/^[A-Za-z][A-Za-z0-9\-_]*$/.test(text)) {
    return null
  }
  const pascal = text
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  if (!ICON_NAME_SET.has(pascal)) {
    return null
  }
  return pascal as MemoryNodeIconName
}

export function MemoryNodeIcon({
  name,
  className,
}: {
  name?: string | null
  className?: string
}) {
  const iconName = normalizeMemoryIconName(name)
  if (!iconName) {
    return null
  }
  const Icon = MEMORY_NODE_ICONS[iconName]
  return <Icon className={cn('h-3.5 w-3.5 shrink-0 opacity-80', className)} aria-hidden />
}

/** For docs / devtools — comma-separated allowlist. */
export function memoryIconAllowlistForDocs(): string {
  return MEMORY_NODE_ICON_NAMES.join(', ')
}
