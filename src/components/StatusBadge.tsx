/**
 * StatusBadge.tsx — Color-Coded Status Indicator
 * 
 * PURPOSE: Renders a small, color-coded pill/badge showing the current status
 * of a request or approval step. Provides instant visual feedback about state.
 * 
 * STATUS → COLOR MAPPING:
 * - PENDING   → Yellow (warning color)
 * - IN_PROGRESS → Blue (info color)
 * - APPROVED  → Green (success color)
 * - RETURNED  → Red (destructive color)
 * - REJECTED  → Red (destructive color)
 * - WAITING   → Gray (muted color)
 * - SKIPPED   → Gray (muted color)
 * 
 * Each status also has a matching icon (Clock, Check, RotateCcw, X, Minus).
 * 
 * SIZING:
 * - 'sm': Smaller text and padding, used in cards and compact views
 * - 'md': Default size, used in detail pages and headers
 * 
 * DESIGN: Uses semantic tokens (text-warning, bg-success/15, etc.) so the
 * colors automatically adjust for light and dark themes.
 */

import { cn } from '@/lib/utils';
import { RequestStatus, StepStatus } from '@/types';
import { Check, Clock, RotateCcw, X, Minus } from 'lucide-react';

interface StatusBadgeProps {
  status: RequestStatus | StepStatus;
  size?: 'sm' | 'md';
}

/**
 * Configuration map: each status maps to a display label, CSS classes, and icon.
 * The className uses Tailwind's opacity modifier (e.g., bg-warning/15) for
 * subtle backgrounds that don't overpower the text.
 */
const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof Check }> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-warning/15 text-warning border-warning/30',
    icon: Clock,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-info/15 text-info border-info/30',
    icon: Clock,
  },
  APPROVED: {
    label: 'Approved',
    className: 'bg-success/15 text-success border-success/30',
    icon: Check,
  },
  RETURNED: {
    label: 'Returned',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
    icon: RotateCcw,
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
    icon: X,
  },
  WAITING: {
    label: 'Waiting',
    className: 'bg-muted text-muted-foreground border-border',
    icon: Clock,
  },
  SKIPPED: {
    label: 'Skipped',
    className: 'bg-muted text-muted-foreground border-border',
    icon: Minus,
  },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  // Fallback to PENDING config if status is unknown
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        config.className,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      {config.label}
    </span>
  );
}
