/**
 * RequestCard.tsx — Request Summary Card Component
 * 
 * PURPOSE: Displays a compact summary of a procurement request in a clickable card.
 * Used in grids on the Dashboard, RequestList, and Approvals pages.
 * 
 * DISPLAYS:
 * - Document icon with request title and short ID (e.g., REQ-0001)
 * - Status badge (Pending/In Progress/Approved/Returned)
 * - Vendor name (if provided)
 * - Creation date
 * - Compact approval progress bar (X/Y approved)
 * 
 * INTERACTIONS:
 * - Entire card is a link to /requests/:id (the detail page)
 * - Hover effect: subtle gradient overlay + "View Details" text
 * 
 * DESIGN: Uses semantic design tokens (bg-primary/10, text-muted-foreground, etc.)
 * to ensure consistent theming across light and dark modes.
 */

import { Link } from 'react-router-dom';
import { ProcurementRequest, ApprovalStep } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { ApprovalProgress } from '@/components/ApprovalProgress';
import { FileText, Building2, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RequestCardProps {
  request: ProcurementRequest;
  steps?: ApprovalStep[];
  showProgress?: boolean;
}

export function RequestCard({ request, steps, showProgress = true }: RequestCardProps) {
  /** Format date to "15 Mar 2026" format */
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Link to={`/requests/${request.id}`}>
      <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-elevated hover:border-primary/30">
        {/* Gradient overlay on hover — adds subtle visual depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Card header: Icon + Title + Status */}
        <CardHeader className="relative pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{request.title}</p>
                <p className="text-sm text-muted-foreground">#{request.short_id}</p>
              </div>
            </div>
            <StatusBadge status={request.status} size="sm" />
          </div>
        </CardHeader>

        {/* Card body: Vendor, date, progress */}
        <CardContent className="relative space-y-3">
          {/* Vendor name (optional) */}
          {request.vendor_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span className="truncate">{request.vendor_name}</span>
            </div>
          )}

          {/* Creation date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Created {formatDate(request.created_at)}</span>
          </div>

          {/* Compact approval progress bar (e.g., "2/3 approved") */}
          {showProgress && steps && steps.length > 0 && (
            <div className="pt-2 border-t border-border">
              <ApprovalProgress steps={steps} compact />
            </div>
          )}

          {/* "View Details" text — appears on hover */}
          <div className="flex items-center justify-end text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            View Details
            <ChevronRight className="h-4 w-4 ml-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
