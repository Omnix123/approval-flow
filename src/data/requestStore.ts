import { ProcurementRequest, ApprovalStep, RequestFile } from '@/types';
import { MOCK_REQUESTS, MOCK_STEPS, MOCK_FILES } from './mockData';
import { useSyncExternalStore, useCallback } from 'react';
import { SignaturePlacement } from '@/components/PDFViewer';

// --------------- internal mutable state ---------------
let requests: ProcurementRequest[] = [...MOCK_REQUESTS];
let steps: Record<string, ApprovalStep[]> = { ...MOCK_STEPS };
let files: Record<string, RequestFile[]> = { ...MOCK_FILES };
let fileBlobs: Record<string, Record<string, string>> = {}; // requestId -> fileId -> blobUrl
let signaturePlacements: Record<string, SignaturePlacement[]> = {}; // requestId -> placements
let nextId = requests.length + 1;

// --------------- subscription system ---------------
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version++;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return version;
}

/** Hook that forces a re-render whenever the store changes */
export function useStoreVersion() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

// --------------- selectors ---------------
export function getRequests() {
  return requests;
}

export function getSteps() {
  return steps;
}

export function getFiles() {
  return files;
}

export function getFileBlobUrl(requestId: string, fileId: string): string | undefined {
  return fileBlobs[requestId]?.[fileId];
}

export function getSignaturePlacements(requestId: string): SignaturePlacement[] {
  return signaturePlacements[requestId] || [];
}

// --------------- mutations ---------------
export function addRequest(
  data: { title: string; vendorName: string; requesterId: string; requesterName: string },
  selectedApproverIds: string[],
  approverNames: Record<string, string>,
  uploadedFiles: File[],
  placements?: SignaturePlacement[]
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

  // Create file entries with blob URLs
  const newFiles: RequestFile[] = [];
  const newBlobs: Record<string, string> = {};

  uploadedFiles.forEach((file, index) => {
    const fileId = `f-${id}-${index}`;
    const blobUrl = URL.createObjectURL(file);
    newFiles.push({
      id: fileId,
      request_id: id,
      path: blobUrl, // use blob URL as path
      filename: file.name,
      type: file.type,
    });
    newBlobs[fileId] = blobUrl;
  });

  requests = [newRequest, ...requests];
  steps[id] = newSteps;
  files[id] = newFiles;
  fileBlobs[id] = newBlobs;

  if (placements && placements.length > 0) {
    signaturePlacements[id] = placements;
  }

  notify();
  return newRequest;
}
