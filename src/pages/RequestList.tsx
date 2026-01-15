import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RequestCard } from '@/components/RequestCard';
import { MOCK_REQUESTS, MOCK_STEPS } from '@/data/mockData';
import { RequestStatus } from '@/types';
import { Plus, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_FILTERS: { value: RequestStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'RETURNED', label: 'Returned' },
];

export default function RequestList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'ALL'>('ALL');

  const filteredRequests = useMemo(() => {
    return MOCK_REQUESTS.filter((request) => {
      // Status filter
      if (statusFilter !== 'ALL' && request.status !== statusFilter) {
        return false;
      }

      // Search filter
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
  }, [searchQuery, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Requests</h1>
          <p className="text-muted-foreground mt-1">
            Browse and manage procurement requests
          </p>
        </div>
        <Button asChild>
          <Link to="/create">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, ID, or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                statusFilter === filter.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No requests found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              steps={MOCK_STEPS[request.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
