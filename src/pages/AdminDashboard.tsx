/**
 * AdminDashboard.tsx — Admin Management Page
 * 
 * PURPOSE: Allows admins to manage positions (custom roles), users, and audit logs.
 * Positions replace fixed roles — admin creates any title (Director, HOD, Clerk, etc.)
 * and maps each to an access level (admin/approver/user) for security.
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { addUserSchema, createPositionSchema } from '@/lib/validation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Shield, Users, ScrollText, Loader2, AlertCircle,
  UserPlus, Activity, Clock, Search, Briefcase, Plus, Trash2, Edit2,
} from 'lucide-react';

// ==================== HOOKS ====================

function usePositions() {
  return useQuery({
    queryKey: ['positions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
}

function useAllUsers() {
  return useQuery({
    queryKey: ['admin-all-users'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const { data: positions } = await supabase
        .from('positions')
        .select('*');

      const roleMap: Record<string, string[]> = {};
      for (const r of roles || []) {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      }

      const posMap: Record<string, any> = {};
      for (const p of positions || []) {
        posMap[p.id] = p;
      }

      return (profiles || []).map(p => ({
        ...p,
        roles: roleMap[p.id] || ['user'],
        primaryRole: roleMap[p.id]?.includes('admin') ? 'admin'
          : roleMap[p.id]?.includes('approver') ? 'approver' : 'user',
        position: p.position_id ? posMap[p.position_id] : null,
      }));
    },
  });
}

function useAuditLogs(searchQuery: string) {
  return useQuery({
    queryKey: ['audit-logs', searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      if (searchQuery) {
        return (data || []).filter(log =>
          log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.resource_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (log.resource_id && log.resource_id.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }
      return data || [];
    },
  });
}

// ==================== POSITION MANAGEMENT ====================

function CreatePositionDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [accessLevel, setAccessLevel] = useState('user');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = createPositionSchema.safeParse({ name, accessLevel, description });
    if (!result.success) { setError(result.error.errors[0].message); return; }

    setIsLoading(true);
    try {
      const { error: insertError } = await supabase
        .from('positions')
        .insert({ name: name.trim(), access_level: accessLevel, description: description.trim() || null });
      if (insertError) throw insertError;
      toast.success(`Position "${name}" created`);
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      setOpen(false);
      setName(''); setAccessLevel('user'); setDescription('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4" />New Position</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create Position</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
          <div className="space-y-2">
            <Label>Position Name *</Label>
            <Input placeholder="e.g., Director, HOD, Clerk" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Access Level *</Label>
            <Select value={accessLevel} onValueChange={setAccessLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User — can create requests</SelectItem>
                <SelectItem value="approver">Approver — can sign/approve documents</SelectItem>
                <SelectItem value="admin">Admin — full system access</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">This controls what the person can do in the system</p>
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input placeholder="Brief description" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Position'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PositionsTab() {
  const { data: positions = [], isLoading } = usePositions();
  const queryClient = useQueryClient();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete position "${name}"? Users with this position will keep their access level.`)) return;
    const { error } = await supabase.from('positions').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Position "${name}" deleted`);
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    }
  };

  const accessBadge = (level: string) => {
    if (level === 'admin') return <Badge>Admin</Badge>;
    if (level === 'approver') return <Badge variant="secondary">Approver</Badge>;
    return <Badge variant="outline">User</Badge>;
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{positions.length} positions defined</p>
        <CreatePositionDialog />
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Position Name</TableHead>
              <TableHead>Access Level</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map(pos => (
              <TableRow key={pos.id}>
                <TableCell className="font-medium">{pos.name}</TableCell>
                <TableCell>{accessBadge(pos.access_level)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{pos.description || '—'}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(pos.id, pos.name)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {positions.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No positions created yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ==================== USER MANAGEMENT ====================

function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [positionId, setPositionId] = useState<string>('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { data: positions = [] } = usePositions();

  const selectedPosition = positions.find(p => p.id === positionId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!positionId) { setError('Please select a position'); return; }
    const pos = positions.find(p => p.id === positionId);
    if (!pos) { setError('Invalid position'); return; }

    const role = pos.access_level as 'user' | 'approver' | 'admin';
    const result = addUserSchema.safeParse({ name, email, password, role, department: department || undefined, positionId });
    if (!result.success) { setError(result.error.errors[0].message); return; }

    setIsLoading(true);
    try {
      const res = await supabase.functions.invoke('admin-create-user', {
        body: { name, email, password, role, department: department || null, positionId },
      });

      if (res.error) throw new Error(res.error.message || 'Failed to create user');
      if (res.data?.error) throw new Error(res.data.error);

      toast.success(`User ${name} created as ${pos.name}`);
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      queryClient.invalidateQueries({ queryKey: ['approver-profiles'] });
      setOpen(false);
      setName(''); setEmail(''); setPassword(''); setPositionId(''); setDepartment('');
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><UserPlus className="mr-2 h-4 w-4" />Add User</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input placeholder="e.g., John Mwanga" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input type="email" placeholder="user@ema.gov" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Password *</Label>
            <Input type="password" placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div className="space-y-2">
            <Label>Position *</Label>
            <Select value={positionId} onValueChange={setPositionId}>
              <SelectTrigger><SelectValue placeholder="Select position..." /></SelectTrigger>
              <SelectContent>
                {positions.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.access_level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPosition && (
              <p className="text-xs text-muted-foreground">
                Access level: <span className="font-medium">{selectedPosition.access_level}</span> — {
                  selectedPosition.access_level === 'admin' ? 'full system access' :
                  selectedPosition.access_level === 'approver' ? 'can sign/approve documents' :
                  'can create requests'
                }
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Input placeholder="e.g., Procurement" value={department} onChange={e => setDepartment(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create User'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UserManagementTab() {
  const { data: users = [], isLoading } = useAllUsers();
  const { data: positions = [] } = usePositions();
  const queryClient = useQueryClient();

  const handleChangePosition = async (userId: string, newPositionId: string) => {
    const pos = positions.find(p => p.id === newPositionId);
    if (!pos) return;

    try {
      // Update position on profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ position_id: newPositionId })
        .eq('id', userId);
      if (profileError) throw profileError;

      // Update system role based on access level
      const { error: deleteError } = await supabase.from('user_roles').delete().eq('user_id', userId);
      if (deleteError) throw deleteError;
      const { error: insertError } = await supabase.from('user_roles').insert({ user_id: userId, role: pos.access_level as any });
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      queryClient.invalidateQueries({ queryKey: ['approver-profiles'] });
      toast.success(`Updated to ${pos.name}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{users.length} users registered</p>
        <AddUserDialog />
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Change Position</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>{user.department || '—'}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{user.position?.name || 'Unassigned'}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.primaryRole === 'admin' ? 'default' : user.primaryRole === 'approver' ? 'secondary' : 'outline'}>
                    {user.primaryRole}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(user.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <Select
                    value={user.position_id || ''}
                    onValueChange={(val) => handleChangePosition(user.id, val)}
                  >
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue placeholder="Set position" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ==================== AUDIT LOGS ====================

function AuditLogsTab() {
  const [search, setSearch] = useState('');
  const { data: logs = [], isLoading } = useAuditLogs(search);

  const actionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-green-600';
    if (action.includes('SIGN')) return 'text-primary';
    if (action.includes('RETURN') || action.includes('REJECT')) return 'text-destructive';
    return 'text-foreground';
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <Card>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ScrollText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No audit logs found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`font-mono text-sm font-medium ${actionColor(log.action)}`}>{log.action}</span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="text-muted-foreground">{log.resource_type}</span>
                    {log.resource_id && <span className="text-xs ml-1 text-muted-foreground/70">({log.resource_id.slice(0, 8)}...)</span>}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{log.ip_address || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {log.details ? JSON.stringify(log.details) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

// ==================== MAIN PAGE ====================

export default function AdminDashboard() {
  const { user } = useAuth();

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage positions, users, and view audit logs</p>
        </div>
      </div>

      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="positions" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />Positions
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />Users
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />Audit Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="positions"><PositionsTab /></TabsContent>
        <TabsContent value="users"><UserManagementTab /></TabsContent>
        <TabsContent value="audit"><AuditLogsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
