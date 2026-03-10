import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RequestCard } from '@/components/RequestCard';
import { useRequests, useAllSteps } from '@/hooks/useSupabaseData';
import {
  Plus, FileText, Clock, CheckCircle2, AlertCircle, TrendingUp, ChevronRight,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { data: allRequests = [], isLoading: reqLoading } = useRequests();
  const { data: allSteps = {}, isLoading: stepsLoading } = useAllSteps();

  const stats = useMemo(() => {
    const pending = allRequests.filter(r => r.status === 'PENDING').length;
    const inProgress = allRequests.filter(r => r.status === 'IN_PROGRESS').length;
    const approved = allRequests.filter(r => r.status === 'APPROVED').length;
    const returned = allRequests.filter(r => r.status === 'RETURNED').length;
    return { pending, inProgress, approved, returned, total: allRequests.length };
  }, [allRequests]);

  const pendingApprovals = useMemo(() => {
    if (!user) return [];
    return allRequests.filter(request => {
      const reqSteps = allSteps[request.id] || [];
      return reqSteps.some(step =>
        step.approver_id === user.id &&
        step.status === 'WAITING' &&
        (step.order_index === 0 || reqSteps[step.order_index - 1]?.status === 'APPROVED')
      );
    });
  }, [user, allRequests, allSteps]);

  const recentRequests = allRequests.slice(0, 4);

  const statCards = [
    { label: 'Total Requests', value: stats.total, icon: FileText, color: 'text-foreground' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-warning' },
    { label: 'In Progress', value: stats.inProgress, icon: TrendingUp, color: 'text-info' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle2, color: 'text-success' },
  ];

  if (reqLoading || stepsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="text-muted-foreground mt-1">Here's an overview of your document approvals</p>
        </div>
        <Button asChild size="lg">
          <Link to="/create"><Plus className="mr-2 h-5 w-5" />New Request</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-secondary ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pendingApprovals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <h2 className="text-lg font-semibold">Awaiting Your Approval</h2>
              <span className="px-2 py-0.5 bg-warning/15 text-warning text-sm font-medium rounded-full">{pendingApprovals.length}</span>
            </div>
            <Button variant="ghost" asChild><Link to="/approvals">View All<ChevronRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {pendingApprovals.slice(0, 2).map((request) => (
              <RequestCard key={request.id} request={request} steps={allSteps[request.id]} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Requests</h2>
          <Button variant="ghost" asChild><Link to="/requests">View All<ChevronRight className="ml-1 h-4 w-4" /></Link></Button>
        </div>
        {recentRequests.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No requests yet. Create your first one!</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {recentRequests.map((request) => (
              <RequestCard key={request.id} request={request} steps={allSteps[request.id]} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
