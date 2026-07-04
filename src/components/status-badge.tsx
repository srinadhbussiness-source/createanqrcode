'use client'

import { Pause, Archive, Square, Dot } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QrStatus } from '@/lib/types'

/**
 * Shape-based status badge — NO colors (per VibePlan spec Section 1.8).
 * Uses iconography instead of color to convey status (accessibility-friendly).
 *  active   → filled dot + "Active"
 *  paused   → pause icon + "Paused"
 *  expired  → filled square + "Expired"
 *  archived → archive icon + "Archived"
 *  trashed  → archive icon + "Trashed"
 */
const STATUS_CONFIG: Record<QrStatus, { icon: typeof Pause; label: string }> = {
  active: { icon: Dot, label: 'Active' },
  paused: { icon: Pause, label: 'Paused' },
  expired: { icon: Square, label: 'Expired' },
  archived: { icon: Archive, label: 'Archived' },
  trashed: { icon: Archive, label: 'Trashed' },
}

export function StatusBadge({ status, className }: { status: QrStatus; className?: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.active
  const Icon = config.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-background px-2 py-0.5 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:text-neutral-400',
        className
      )}
    >
      <Icon className={cn('h-3 w-3', status === 'active' && 'fill-current')} aria-hidden />
      {config.label}
    </span>
  )
}
