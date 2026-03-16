/**
 * ApprovalProgress.tsx — Visual Approval Timeline Component
 * 
 * PURPOSE: Displays the approval chain as a vertical timeline, showing each
 * approver's status (Pending, Signed, or Returned) with visual indicators.
 * 
 * TWO DISPLAY MODES:
 * 1. Full mode (default): Vertical timeline with step details
 * 2. Compact mode: Horizontal progress bar with "X/Y approved" text
 * 
 * VISUAL INDICATORS:
 * - Green circle + checkmark = Approved (signed)
 * - Red circle + rotate icon = Returned (rejected)
 * - Gray circle + clock = Waiting (pending)
 * - Pulsing ring = Current step (next to sign)
 * - Connecting lines between steps show flow
 * 
 * USED BY: Dashboard (RequestCard), RequestDetail, DocumentViewer sidebar
 * 
 * PROPS:
 * - steps: Array of ApprovalStep objects (ordered by order_index)
 * - compact: If true, renders as a simple progress bar instead of full timeline
 */

import { cn } from '@/lib/utils';
import { ApprovalStep } from '@/types';
import { Check, Clock, RotateCcw, User } from 'lucide-react';

interface ApprovalProgressProps {
  steps: ApprovalStep[];
  compact?: boolean;
}

export function ApprovalProgress({ steps, compact = false }: ApprovalProgressProps) {
  /** Map status to the appropriate icon component */
  const getStepIcon = (status: ApprovalStep['status']) => {
    switch (status) {
      case 'APPROVED':
        return Check;          // ✓ checkmark
      case 'RETURNED':
        return RotateCcw;      // ↺ rotate/return arrow
      default:
        return Clock;          // ⏰ waiting clock
    }
  };

  /** Map status to background/text/border colors using semantic design tokens */
  const getStepColor = (status: ApprovalStep['status']) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-success text-success-foreground border-success';
      case 'RETURNED':
        return 'bg-destructive text-destructive-foreground border-destructive';
      case 'WAITING':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  /** Map status to the connecting line color between steps */
  const getLineColor = (status: ApprovalStep['status']) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-success';       // Green line = completed
      case 'RETURNED':
        return 'bg-destructive';   // Red line = returned
      default:
        return 'bg-border';        // Gray line = pending
    }
  };

  /**
   * COMPACT MODE: Simple progress bar with fraction text
   * Used in RequestCard to show progress at a glance
   */
  if (compact) {
    const approved = steps.filter(s => s.status === 'APPROVED').length;
    const total = steps.length;
    const progress = (approved / total) * 100;
    
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-success transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {approved}/{total} approved
        </span>
      </div>
    );
  }

  /**
   * FULL MODE: Vertical timeline with step details
   * Each step shows: icon, name, step number, status, date, and notes
   */
  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const Icon = getStepIcon(step.status);
        const isLast = index === steps.length - 1;

        // A step is "current" if it's WAITING and all previous steps are APPROVED
        const isCurrentStep = step.status === 'WAITING' && 
          (index === 0 || steps[index - 1]?.status === 'APPROVED');

        return (
          <div key={step.id} className="flex">
            {/* Left column: Circle icon + connecting line */}
            <div className="flex flex-col items-center mr-4">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                  getStepColor(step.status),
                  isCurrentStep && 'ring-2 ring-primary ring-offset-2'  // Pulsing ring for current step
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              {/* Vertical connecting line (not shown after the last step) */}
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 flex-1 min-h-[3rem]',
                    getLineColor(step.status)
                  )}
                />
              )}
            </div>

            {/* Right column: Step details */}
            <div className={cn('flex-1 pb-8', isLast && 'pb-0')}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={cn(
                    'font-medium',
                    isCurrentStep ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {step.approver_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Step {step.order_index + 1}
                  </p>
                </div>
                <div className="text-right">
                  {/* Status label with color */}
                  <span
                    className={cn(
                      'text-sm font-medium',
                      step.status === 'APPROVED' && 'text-success',
                      step.status === 'RETURNED' && 'text-destructive',
                      step.status === 'WAITING' && 'text-muted-foreground'
                    )}
                  >
                    {step.status === 'APPROVED' ? 'Signed' : step.status === 'RETURNED' ? 'Returned' : 'Pending'}
                  </span>
                  {/* Date when step was signed */}
                  {step.signed_at && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(step.signed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Return note (shown when step was rejected with a reason) */}
              {step.note && (
                <div className="mt-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm text-destructive">{step.note}</p>
                </div>
              )}

              {/* "Awaiting signature" indicator for the current active step */}
              {isCurrentStep && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Awaiting signature
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
