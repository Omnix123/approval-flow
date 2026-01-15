import { cn } from '@/lib/utils';
import { RequestStatus, StepStatus } from '@/types';
import { Check, Clock, RotateCcw, X, Minus } from 'lucide-react';

interface StatusBadgeProps {
  status: RequestStatus | StepStatus;
  size?: 'sm' | 'md';
}

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
