import { ProcurementRequest, ApprovalStep, RequestFile, Comment, User } from '@/types';

export const DEPARTMENTS = [
  'Administration',
  'Accounts',
  'Finance',
  'Procurement',
  'Operations',
  'IT',
  'Legal',
];

export const APPROVAL_CHAIN: { role: string; department: string; order: number }[] = [
  { role: 'Administration Officer', department: 'Administration', order: 0 },
  { role: 'Accounts Officer', department: 'Accounts', order: 1 },
  { role: 'Accountant', department: 'Accounts', order: 2 },
  { role: 'Finance & Administration Manager', department: 'Finance', order: 3 },
];

export const MOCK_USERS: User[] = [
  { id: '1', name: 'John Mwanga', email: 'john@ema.gov', role: 'user', department: 'Procurement' },
  { id: '2', name: 'Sarah Chipo', email: 'sarah@ema.gov', role: 'approver', department: 'Administration' },
  { id: '3', name: 'David Moyo', email: 'david@ema.gov', role: 'approver', department: 'Accounts' },
  { id: '4', name: 'Grace Sithole', email: 'grace@ema.gov', role: 'approver', department: 'Finance' },
  { id: '5', name: 'Admin User', email: 'admin@ema.gov', role: 'admin', department: 'IT' },
  { id: '6', name: 'Peter Ncube', email: 'peter@ema.gov', role: 'approver', department: 'Accounts' },
];

export const MOCK_REQUESTS: ProcurementRequest[] = [
  {
    id: 'req-001',
    short_id: 'REQ-001',
    title: 'Office Stationery Supplies Q1',
    vendor_name: 'Office Solutions Ltd',
    requester_id: '1',
    requester_name: 'John Mwanga',
    status: 'IN_PROGRESS',
    created_at: '2026-01-10T08:30:00Z',
    updated_at: '2026-01-12T14:20:00Z',
  },
  {
    id: 'req-002',
    short_id: 'REQ-002',
    title: 'Vehicle Maintenance - Fleet Service',
    vendor_name: 'AutoCare Zimbabwe',
    requester_id: '1',
    requester_name: 'John Mwanga',
    status: 'PENDING',
    created_at: '2026-01-14T09:15:00Z',
    updated_at: '2026-01-14T09:15:00Z',
  },
  {
    id: 'req-003',
    short_id: 'REQ-003',
    title: 'IT Equipment - Laptops x5',
    vendor_name: 'TechWorld Harare',
    requester_id: '1',
    requester_name: 'John Mwanga',
    status: 'RETURNED',
    created_at: '2026-01-08T11:00:00Z',
    updated_at: '2026-01-13T16:45:00Z',
  },
  {
    id: 'req-004',
    short_id: 'REQ-004',
    title: 'Environmental Monitoring Equipment',
    vendor_name: 'GreenTech Africa',
    requester_id: '1',
    requester_name: 'John Mwanga',
    status: 'APPROVED',
    created_at: '2026-01-05T10:00:00Z',
    updated_at: '2026-01-09T15:30:00Z',
  },
];

export const MOCK_STEPS: Record<string, ApprovalStep[]> = {
  'req-001': [
    { id: 's1', request_id: 'req-001', order_index: 0, approver_id: '2', approver_name: 'Sarah Chipo', status: 'APPROVED', signed_at: '2026-01-11T10:00:00Z' },
    { id: 's2', request_id: 'req-001', order_index: 1, approver_id: '3', approver_name: 'David Moyo', status: 'WAITING' },
    { id: 's3', request_id: 'req-001', order_index: 2, approver_id: '6', approver_name: 'Peter Ncube', status: 'WAITING' },
    { id: 's4', request_id: 'req-001', order_index: 3, approver_id: '4', approver_name: 'Grace Sithole', status: 'WAITING' },
  ],
  'req-002': [
    { id: 's5', request_id: 'req-002', order_index: 0, approver_id: '2', approver_name: 'Sarah Chipo', status: 'WAITING' },
    { id: 's6', request_id: 'req-002', order_index: 1, approver_id: '3', approver_name: 'David Moyo', status: 'WAITING' },
    { id: 's7', request_id: 'req-002', order_index: 2, approver_id: '6', approver_name: 'Peter Ncube', status: 'WAITING' },
    { id: 's8', request_id: 'req-002', order_index: 3, approver_id: '4', approver_name: 'Grace Sithole', status: 'WAITING' },
  ],
  'req-003': [
    { id: 's9', request_id: 'req-003', order_index: 0, approver_id: '2', approver_name: 'Sarah Chipo', status: 'APPROVED', signed_at: '2026-01-09T09:00:00Z' },
    { id: 's10', request_id: 'req-003', order_index: 1, approver_id: '3', approver_name: 'David Moyo', status: 'RETURNED', note: 'Budget line incorrect. Please update and resubmit.' },
    { id: 's11', request_id: 'req-003', order_index: 2, approver_id: '6', approver_name: 'Peter Ncube', status: 'WAITING' },
    { id: 's12', request_id: 'req-003', order_index: 3, approver_id: '4', approver_name: 'Grace Sithole', status: 'WAITING' },
  ],
  'req-004': [
    { id: 's13', request_id: 'req-004', order_index: 0, approver_id: '2', approver_name: 'Sarah Chipo', status: 'APPROVED', signed_at: '2026-01-06T10:00:00Z' },
    { id: 's14', request_id: 'req-004', order_index: 1, approver_id: '3', approver_name: 'David Moyo', status: 'APPROVED', signed_at: '2026-01-07T11:00:00Z' },
    { id: 's15', request_id: 'req-004', order_index: 2, approver_id: '6', approver_name: 'Peter Ncube', status: 'APPROVED', signed_at: '2026-01-08T09:30:00Z' },
    { id: 's16', request_id: 'req-004', order_index: 3, approver_id: '4', approver_name: 'Grace Sithole', status: 'APPROVED', signed_at: '2026-01-09T15:30:00Z' },
  ],
};

export const MOCK_COMMENTS: Record<string, Comment[]> = {
  'req-003': [
    {
      id: 'c1',
      request_id: 'req-003',
      from_user_id: '3',
      from_name: 'David Moyo',
      to_user_id: '1',
      to_name: 'John Mwanga',
      message: 'The budget line specified does not match our records. Please verify with Finance and update the form.',
      created_at: '2026-01-13T16:45:00Z',
      step_index: 1,
    },
  ],
};

export const MOCK_FILES: Record<string, RequestFile[]> = {
  'req-001': [
    { id: 'f1', request_id: 'req-001', path: '/files/req-001/requisition.pdf', filename: 'Payment_Requisition_Form.pdf', type: 'application/pdf' },
    { id: 'f2', request_id: 'req-001', path: '/files/req-001/quote.pdf', filename: 'Vendor_Quotation.pdf', type: 'application/pdf' },
  ],
  'req-002': [
    { id: 'f3', request_id: 'req-002', path: '/files/req-002/requisition.pdf', filename: 'Payment_Requisition_Form.pdf', type: 'application/pdf' },
  ],
  'req-003': [
    { id: 'f4', request_id: 'req-003', path: '/files/req-003/requisition.pdf', filename: 'Payment_Requisition_Form.pdf', type: 'application/pdf' },
    { id: 'f5', request_id: 'req-003', path: '/files/req-003/specs.pdf', filename: 'Equipment_Specifications.pdf', type: 'application/pdf' },
  ],
  'req-004': [
    { id: 'f6', request_id: 'req-004', path: '/files/req-004/requisition.pdf', filename: 'Payment_Requisition_Form.pdf', type: 'application/pdf' },
  ],
};
