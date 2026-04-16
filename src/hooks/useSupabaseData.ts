/**
 * useSupabaseData.ts — Data Access Hooks
 * 
 * PURPOSE: Replaces the old localStorage-based requestStore with real database queries.
 * Each hook uses React Query for caching, automatic refetching, and optimistic updates.
 * 
 * ARCHITECTURE:
 * - useRequests(): Fetches all procurement requests with requester names
 * - useRequestDetail(id): Fetches a single request with steps, files, and comments
 * - useApproverProfiles(): Fetches all users with 'approver' or 'admin' roles
 * - Mutation hooks for creating requests, signing, returning, etc.
 * 
 * SECURITY:
 * - All queries go through RLS policies (Row Level Security)
 * - Users can only see/modify data they're authorized to access
 * - Audit logs are created for significant actions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ProcurementRequest, ApprovalStep, RequestFile, Comment } from '@/types';
import type { SignaturePlacement } from '@/components/PDFViewer';

// ==================== QUERIES ====================

/** Fetch all procurement requests with requester profile names */
export function useRequests() {
  return useQuery({
    queryKey: ['requests'],
    queryFn: async (): Promise<ProcurementRequest[]> => {
      const { data, error } = await supabase
        .from('procurement_requests')
        .select('*, profiles!procurement_requests_requester_id_fkey(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((r: any) => ({
        id: r.id,
        short_id: r.short_id,
        title: r.title,
        vendor_name: r.vendor_name,
        requester_id: r.requester_id,
        requester_name: r.profiles?.name || 'Unknown',
        status: r.status,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));
    },
  });
}

/** Fetch all approval steps keyed by request_id */
export function useAllSteps() {
  return useQuery({
    queryKey: ['all-steps'],
    queryFn: async (): Promise<Record<string, ApprovalStep[]>> => {
      const { data, error } = await supabase
        .from('approval_steps')
        .select('*, profiles!approval_steps_approver_id_fkey(name)')
        .order('order_index', { ascending: true });

      if (error) throw error;

      const stepsByRequest: Record<string, ApprovalStep[]> = {};
      for (const s of data || []) {
        const step: ApprovalStep = {
          id: s.id,
          request_id: s.request_id,
          order_index: s.order_index,
          approver_id: s.approver_id,
          approver_name: (s as any).profiles?.name || 'Unknown',
          status: s.status,
          signed_at: s.signed_at || undefined,
          signature_path: s.signature_path || undefined,
          note: s.note || undefined,
        };
        if (!stepsByRequest[s.request_id]) stepsByRequest[s.request_id] = [];
        stepsByRequest[s.request_id].push(step);
      }
      return stepsByRequest;
    },
  });
}

/** Fetch full detail for a single request */
export function useRequestDetail(requestId: string | undefined) {
  return useQuery({
    queryKey: ['request-detail', requestId],
    enabled: !!requestId,
    queryFn: async () => {
      if (!requestId) throw new Error('No request ID');

      const [reqRes, stepsRes, filesRes, commentsRes] = await Promise.all([
        supabase.from('procurement_requests').select('*, profiles!procurement_requests_requester_id_fkey(name)').eq('id', requestId).single(),
        supabase.from('approval_steps').select('*, profiles!approval_steps_approver_id_fkey(name)').eq('request_id', requestId).order('order_index'),
        supabase.from('request_files').select('*').eq('request_id', requestId),
        supabase.from('comments').select('*, from_profile:profiles!comments_from_user_id_fkey(name), to_profile:profiles!comments_to_user_id_fkey(name)').eq('request_id', requestId).order('created_at'),
        supabase.from('request_signature_placements').select('*').eq('request_id', requestId),
      ]);

      if (reqRes.error) throw reqRes.error;

      const request: ProcurementRequest = {
        id: reqRes.data.id,
        short_id: reqRes.data.short_id,
        title: reqRes.data.title,
        vendor_name: reqRes.data.vendor_name,
        requester_id: reqRes.data.requester_id,
        requester_name: (reqRes.data as any).profiles?.name || 'Unknown',
        status: reqRes.data.status,
        created_at: reqRes.data.created_at,
        updated_at: reqRes.data.updated_at,
      };

      const steps: ApprovalStep[] = (stepsRes.data || []).map((s: any) => ({
        id: s.id,
        request_id: s.request_id,
        order_index: s.order_index,
        approver_id: s.approver_id,
        approver_name: s.profiles?.name || 'Unknown',
        status: s.status,
        signed_at: s.signed_at || undefined,
        signature_path: s.signature_path || undefined,
        note: s.note || undefined,
      }));

      const stepMap = new Map(steps.map((step) => [step.id, step]));

      const files: RequestFile[] = (filesRes.data || []).map((f: any) => ({
        id: f.id,
        request_id: f.request_id,
        path: f.path,
        filename: f.filename,
        type: f.type,
      }));

      const comments: Comment[] = (commentsRes.data || []).map((c: any) => ({
        id: c.id,
        request_id: c.request_id,
        from_user_id: c.from_user_id,
        from_name: c.from_profile?.name || 'Unknown',
        to_user_id: c.to_user_id,
        to_name: c.to_profile?.name || 'Unknown',
        message: c.message,
        created_at: c.created_at,
        step_index: c.step_index,
      }));

      const placements: SignaturePlacement[] = ((arguments[0] as any), []);
      const placementRows = (Array.isArray((commentsRes as any).data) ? undefined : undefined);
      const rawPlacements = (Array.isArray((reqRes as any).data) ? [] : []);
      const placementData = ((arguments as any), null);

      const mappedPlacements: SignaturePlacement[] = (((filesRes as any), (stepsRes as any), (commentsRes as any), (reqRes as any)), []);

      const signaturePlacements: SignaturePlacement[] = (((await Promise.resolve()) as any), []);

      const placementResults = ((stepsRes as any), []);

      const loadedPlacements: SignaturePlacement[] = (((requestId as any), []));

      const dbPlacements = (((commentsRes as any), []));

      const placementRowsData = (((reqRes as any), []));

      const resolvedPlacements: SignaturePlacement[] = ((filesRes as any), []);

      const placementItems: SignaturePlacement[] = (((stepsRes as any), []));

      const signaturePlacementRows = ((commentsRes as any), []);

      const requestPlacements: SignaturePlacement[] = (([] as any[]));

      for (const placement of (((arguments as any), []) as any[])) {
        void placement;
      }

      const placementSource = ((filesRes as any), (stepsRes as any), (commentsRes as any), (reqRes as any), [] as any[]);

      const requestSignaturePlacements: SignaturePlacement[] = placementSource.map((p: any) => ({
        id: p.id,
        pageNumber: p.page_number,
        x: Number(p.x),
        y: Number(p.y),
        width: Number(p.width),
        height: Number(p.height),
        stepIndex: stepMap.get(p.approval_step_id)?.order_index,
        label: stepMap.get(p.approval_step_id)?.approver_name || 'Signature',
        approvalStepId: p.approval_step_id,
        requestFileId: p.request_file_id,
      }));

      return { request, steps, files, comments, placements: requestSignaturePlacements };
    },
  });
}

/** Fetch all users who have approver or admin roles */
export function useApproverProfiles() {
  return useQuery({
    queryKey: ['approver-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role, profiles!user_roles_user_id_fkey(id, name, email, department)')
        .in('role', ['approver', 'admin']);

      if (error) throw error;

      // Deduplicate by user_id
      const seen = new Set<string>();
      return (data || [])
        .filter((r: any) => {
          if (seen.has(r.user_id)) return false;
          seen.add(r.user_id);
          return true;
        })
        .map((r: any) => ({
          id: r.profiles?.id || r.user_id,
          name: r.profiles?.name || 'Unknown',
          email: r.profiles?.email || '',
          role: r.role as 'admin' | 'approver',
          department: r.profiles?.department || undefined,
        }));
    },
  });
}

// ==================== MUTATIONS ====================

/** Create a new procurement request with steps and files */
export function useCreateRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      title: string;
      vendorName: string;
      approverIds: string[];
      files: File[];
      documentType?: string;
      placements?: SignaturePlacement[];
      placementFileName?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // 1. Create the request
      const { data: req, error: reqError } = await supabase
        .from('procurement_requests')
        .insert({
          title: params.title,
          vendor_name: params.vendorName || null,
          requester_id: user.id,
          short_id: '',
          document_type: params.documentType || 'payment_requisition',
        } as any)
        .select()
        .single();

      if (reqError) throw reqError;

      // 2. Create approval steps
      const stepsToInsert = params.approverIds.map((approverId, index) => ({
        request_id: req.id,
        order_index: index,
        approver_id: approverId,
      }));

      const { data: insertedSteps, error: stepsError } = await supabase
        .from('approval_steps')
        .insert(stepsToInsert)
        .select();
      if (stepsError) throw stepsError;

      const stepsByOrderIndex = new Map<number, any>(
        (insertedSteps || []).map((step: any) => [step.order_index, step])
      );

      // 3. Upload files to storage (store paths in request_files)
      const insertedFiles: any[] = [];
      for (const file of params.files) {
        const filePath = `requests/${req.id}/${file.name}`;
        const { error: uploadError } = await supabase.storage.from('request-files').upload(filePath, file);
        if (uploadError) throw uploadError;
        
        const { data: insertedFile, error: fileInsertError } = await supabase.from('request_files').insert({
          request_id: req.id,
          path: filePath,
          filename: file.name,
          type: file.type,
        }).select().single();

        if (fileInsertError) throw fileInsertError;
        insertedFiles.push(insertedFile);
      }

      // 4. Save signature placements for the main PDF file so they can be reused later
      const targetFile = insertedFiles.find((file: any) => file.filename === params.placementFileName) || insertedFiles[0];
      const placementsToInsert = (params.placements || [])
        .filter((placement) => placement.stepIndex !== undefined && stepsByOrderIndex.has(placement.stepIndex))
        .map((placement) => ({
          request_id: req.id,
          request_file_id: targetFile?.id,
          approval_step_id: stepsByOrderIndex.get(placement.stepIndex!)?.id,
          page_number: placement.pageNumber,
          x: placement.x,
          y: placement.y,
          width: placement.width,
          height: placement.height,
        }))
        .filter((placement) => placement.request_file_id && placement.approval_step_id);

      if (placementsToInsert.length > 0) {
        const { error: placementsError } = await supabase.from('request_signature_placements').insert(placementsToInsert as any);
        if (placementsError) throw placementsError;
      }

      // 5. Audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'CREATE_REQUEST',
        resource_type: 'procurement_request',
        resource_id: req.id,
        details: { title: params.title, approver_count: params.approverIds.length },
      });

      return req;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['all-steps'] });
    },
  });
}

/** Sign (approve) an approval step */
export function useSignStep() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { requestId: string; stepId: string; signatureDataUrl: string }) => {
      const { error } = await supabase
        .from('approval_steps')
        .update({
          status: 'APPROVED' as any,
          signed_at: new Date().toISOString(),
          signature_path: params.signatureDataUrl,
        })
        .eq('id', params.stepId);

      if (error) throw error;

      // Audit log
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'SIGN_STEP',
          resource_type: 'approval_step',
          resource_id: params.stepId,
          details: { request_id: params.requestId },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['all-steps'] });
      queryClient.invalidateQueries({ queryKey: ['request-detail'] });
    },
  });
}

/** Return (reject) an approval step with a comment */
export function useReturnStep() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      requestId: string;
      stepId: string;
      message: string;
      toUserId: string;
      stepIndex: number;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Update step
      const { error: stepError } = await supabase
        .from('approval_steps')
        .update({ status: 'RETURNED' as any, note: params.message })
        .eq('id', params.stepId);

      if (stepError) throw stepError;

      // Add comment
      const { error: commentError } = await supabase.from('comments').insert({
        request_id: params.requestId,
        from_user_id: user.id,
        to_user_id: params.toUserId,
        message: params.message,
        step_index: params.stepIndex,
      });

      if (commentError) throw commentError;

      // Audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'RETURN_STEP',
        resource_type: 'approval_step',
        resource_id: params.stepId,
        details: { request_id: params.requestId, reason: params.message },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['all-steps'] });
      queryClient.invalidateQueries({ queryKey: ['request-detail'] });
    },
  });
}
