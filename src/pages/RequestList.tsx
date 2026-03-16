/**
 * RequestList.tsx — All Requests Browser (Route: /requests)
 * 
 * PURPOSE: Displays all procurement requests in a searchable, filterable grid.
 * Users can search by title, short ID, or vendor name, and filter by status.
 * 
 * FEATURES:
 * - Text search: Filters by title, short_id, or vendor_name (case-insensitive)
 * - Status filter: Pill buttons for All / Pending / In Progress / Approved / Returned
 * - Responsive grid: 1 column on mobile, 2 on tablet, 3 on desktop
 * 
 * DATA:
 * - useRequests() returns all requests, sorted by created_at DESC (newest first)
 * - useAllSteps() provides approval steps for the progress bars on each card
 * - useMemo ensures filtering only recalculates when inputs change
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RequestCard } from '@/components/RequestCard';
import { useRequests, useAllSteps } from '@/hooks/useSupabaseData';
import { RequestStatus } from '@/types';
import { Plus, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Available status filter options */
const STATUS_FILTERS: { value: RequestStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'RETURNED', label: 'Returned' },
];

export default function RequestList() {
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'ALL'>('ALL');

  // Fetch data from the database
  const { data: allRequests = [], isLoading } = useRequests();
  const { data: allSteps = {} } = useAllSteps();

  /**
   * Apply search and status filters to the full request list.
   * useMemo ensures this only runs when the filter inputs or data change.
   */
  const filteredRequests = useMemo(() => {
    return allRequests.filter((request) => {
      // Status filter
      if (statusFilter !== 'ALL' && request.status !== statusFilter) return false;
      // Text search (case-insensitive)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          request.title.toLowerCase().includes(query) ||
          request.short_id.toLowerCase().includes(query) ||
          request.vendor_name?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [searchQuery, statusFilter, allRequests]);

  // Loading state
  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Requests</h1>
          <p className="text-muted-foreground mt-1">Browse and manage procurement requests</p>
        </div>
        <Button asChild><Link to="/create"><Plus className="mr-2 h-4 w-4" />New Request</Link></Button>
      </div>

      {/* Search bar and status filter pills */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search input with icon */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by title, ID, or vendor..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        {/* Status filter pills — horizontal scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {STATUS_FILTERS.map((filter) => (
            <button key={filter.value} onClick={() => setStatusFilter(filter.value)} className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              statusFilter === filter.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}>{filter.label}</button>
          ))}
        </div>
      </div>

      {/* Request cards grid */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12"><p className="text-muted-foreground">No requests found</p></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map((request) => (
            <RequestCard key={request.id} request={request} steps={allSteps[request.id]} />
          ))}
        </div>
      )}
    </div>
  );
}
