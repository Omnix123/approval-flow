import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { RequestCard } from '@/components/RequestCard';
import { useRequests, useAllSteps } from '@/hooks/useSupabaseData';
import { ClipboardCheck, Inbox } from 'lucide-react';

export default function Approvals() {
  const { user } = useAuth();
  const { data: allRequests = [], isLoading } = useRequests();
  const { data: allSteps = {} } = useAllSteps();

  const pendingApprovals = useMemo(() => {
    if (!user) return [];
    return allRequests.filter((request) => {
      const reqSteps = allSteps[request.id] || [];
      return reqSteps.some(step =>
        step.approver_id === user.id &&
        step.status === 'WAITING' &&
        (step.order_index === 0 || reqSteps[step.order_index - 1]?.status === 'APPROVED')
      );
    });
  }, [user, allRequests, allSteps]);

  const completedApprovals = useMemo(() => {
    if (!user) return [];
    return allRequests.filter((request) => {
      const reqSteps = allSteps[request.id] || [];
      return reqSteps.some(step =>
        step.approver_id === user.id &&
        (step.status === 'APPROVED' || step.status === 'RETURNED')
      );
    });
  }, [user, allRequests, allSteps]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6" />My Approvals
        </h1>
        <p className="text-muted-foreground mt-1">Review and sign procurement requests awaiting your approval</p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">
          Awaiting Your Signature
          {pendingApprovals.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-warning/15 text-warning text-sm font-medium rounded-full">{pendingApprovals.length}</span>
          )}
        </h2>
        {pendingApprovals.length === 0 ? (
          <div className="text-center py-12 bg-secondary/30 rounded-lg">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No pending approvals</p>
            <p className="text-sm text-muted-foreground mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingApprovals.map((request) => (
              <RequestCard key={request.id} request={request} steps={allSteps[request.id]} />
            ))}
          </div>
        )}
      </section>

      {completedApprovals.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Recently Reviewed</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedApprovals.map((request) => (
              <RequestCard key={request.id} request={request} steps={allSteps[request.id]} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
