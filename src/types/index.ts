export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'approver';
  department?: string;
}

export interface ApprovalStep {
  id: string;
  request_id: string;
  order_index: number;
  approver_id: string;
  approver_name: string;
  status: 'WAITING' | 'APPROVED' | 'RETURNED' | 'SKIPPED';
  signed_at?: string;
  signature_path?: string;
  note?: string;
}

export interface RequestFile {
  id: string;
  request_id: string;
  path: string;
  filename: string;
  type?: string;
}

export interface Comment {
  id: string;
  request_id: string;
  from_user_id: string;
  from_name: string;
  to_user_id: string;
  to_name: string;
  message: string;
  created_at: string;
  step_index?: number;
}

export interface ProcurementRequest {
  id: string;
  short_id: string;
  title: string;
  vendor_name?: string;
  requester_id: string;
  requester_name?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'RETURNED' | 'REJECTED';
  created_at: string;
  updated_at: string;
}

export interface RequestDetail {
  request: ProcurementRequest;
  files: RequestFile[];
  steps: ApprovalStep[];
  comments?: Comment[];
}

export type RequestStatus = ProcurementRequest['status'];
export type StepStatus = ApprovalStep['status'];
