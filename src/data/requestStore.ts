import { ProcurementRequest, ApprovalStep, RequestFile } from '@/types';
import { MOCK_REQUESTS, MOCK_STEPS, MOCK_FILES } from './mockData';

// Mutable in-memory store seeded from mock data
let requests: ProcurementRequest[] = [...MOCK_REQUESTS];
let steps: Record<string, ApprovalStep[]> = { ...MOCK_STEPS };
let files: Record<string, RequestFile[]> = { ...MOCK_FILES };
let nextId = requests.length + 1;

export function getRequests() {
  return requests;
}

export function getSteps() {
  return steps;
}

export function getFiles() {
  return files;
}

export function addRequest(
  data: { title: string; vendorName: string; requesterId: string; requesterName: string },
  selectedApproverIds: string[],
  approverNames: Record<string, string>,
  uploadedFiles: File[]
): ProcurementRequest {
  const id = `req-${String(nextId).padStart(3, '0')}`;
  const shortId = `REQ-${String(nextId).padStart(3, '0')}`;
  nextId++;

  const now = new Date().toISOString();

  const newRequest: ProcurementRequest = {
    id,
    short_id: shortId,
    title: data.title,
    vendor_name: data.vendorName || undefined,
    requester_id: data.requesterId,
    requester_name: data.requesterName,
    status: 'PENDING',
    created_at: now,
    updated_at: now,
  };

  // Create approval steps
  const newSteps: ApprovalStep[] = selectedApproverIds.map((approverId, index) => ({
    id: `s-${id}-${index}`,
    request_id: id,
    order_index: index,
    approver_id: approverId,
    approver_name: approverNames[approverId] || 'Unknown',
    status: 'WAITING' as const,
  }));

  // Create file entries (no actual upload since there's no backend)
  const newFiles: RequestFile[] = uploadedFiles.map((file, index) => ({
    id: `f-${id}-${index}`,
    request_id: id,
    path: '',
    filename: file.name,
    type: file.type,
  }));

  requests = [newRequest, ...requests];
  steps[id] = newSteps;
  files[id] = newFiles;

  return newRequest;
}
