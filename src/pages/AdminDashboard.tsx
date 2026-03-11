/**
 * AdminDashboard.tsx — Admin Management Page
 * 
 * PURPOSE: Allows admins to view audit logs and manage users (add new users, change roles).
 * Only accessible to users with the 'admin' role.
 * 
 * SECURITY: All operations go through RLS policies. User creation uses a backend function.
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { addUserSchema, type AddUserInput } from '@/lib/validation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Shield, Users, ScrollText, Plus, Loader2, AlertCircle,
  UserPlus, Activity, Clock, Search,
} from 'lucide-react';

// ==================== HOOKS ====================

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

      const roleMap: Record<string, string[]> = {};
      for (const r of roles || []) {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      }

      return (profiles || []).map(p => ({
        ...p,
        roles: roleMap[p.id] || ['user'],
        primaryRole: roleMap[p.id]?.includes('admin') ? 'admin'
          : roleMap[p.id]?.includes('approver') ? 'approver' : 'user',
      }));
    },
  });
}

function useAuditLogs(searchQuery: string) {
  return useQuery({
    queryKey: ['audit-logs', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const { data, error } = await query;
      if (error) throw error;

      // Client-side filter for search
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

function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      // Delete existing roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      if (deleteError) throw deleteError;

      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole as any });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      queryClient.invalidateQueries({ queryKey: ['approver-profiles'] });
      toast.success('Role updated successfully');
    },
    onError: (err: any) => toast.error(err.message),
  });
}

// ==================== COMPONENTS ====================

function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('user');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate with Zod
    const result = addUserSchema.safeParse({ name, email, password, role, department: department || undefined });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      // Use the edge function to create user (admin-only)
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('admin-create-user', {
        body: { name, email, password, role, department: department || null },
      });

      if (res.error) throw new Error(res.error.message || 'Failed to create user');
      if (res.data?.error) throw new Error(res.data.error);

      toast.success(`User ${name} created successfully`);
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      queryClient.invalidateQueries({ queryKey: ['approver-profiles'] });
      setOpen(false);
      setName(''); setEmail(''); setPassword(''); setRole('user'); setDepartment('');
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
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
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
            <Label>Role *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="approver">Approver</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
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
  const updateRole = useUpdateUserRole();

  const roleBadgeVariant = (role: string) => {
    if (role === 'admin') return 'default';
    if (role === 'approver') return 'secondary';
    return 'outline';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

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
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>{user.department || '—'}</TableCell>
                <TableCell>
                  <Badge variant={roleBadgeVariant(user.primaryRole)}>
                    {user.primaryRole}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(user.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <Select
                    value={user.primaryRole}
                    onValueChange={(newRole) => updateRole.mutate({ userId: user.id, newRole })}
                  >
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="approver">Approver</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
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

function AuditLogsTab() {
  const [search, setSearch] = useState('');
  const { data: logs = [], isLoading } = useAuditLogs(search);

  const actionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-success';
    if (action.includes('SIGN')) return 'text-primary';
    if (action.includes('RETURN') || action.includes('REJECT')) return 'text-destructive';
    return 'text-foreground';
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search logs by action or resource..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
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
                    <span className={`font-mono text-sm font-medium ${actionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="text-muted-foreground">{log.resource_type}</span>
                    {log.resource_id && (
                      <span className="text-xs ml-1 text-muted-foreground/70">
                        ({log.resource_id.slice(0, 8)}...)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {log.ip_address || '—'}
                  </TableCell>
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

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, roles, and view audit logs</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />Users
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />Audit Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagementTab />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
