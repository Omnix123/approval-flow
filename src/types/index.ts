/**
 * types/index.ts — TypeScript Type Definitions
 * 
 * PURPOSE: Central type definitions for all data models used throughout the application.
 * These types mirror the database schema but are optimized for frontend use
 * (e.g., including computed fields like requester_name that come from JOINs).
 * 
 * WHY SEPARATE FROM SUPABASE TYPES:
 * The auto-generated types in integrations/supabase/types.ts reflect the raw database
 * schema. These custom types add:
 * - Computed/joined fields (e.g., approver_name from profiles)
 * - Optional fields with proper undefined handling
 * - Union types for status enums
 * 
 * USED BY: Every component, hook, and page that handles data.
 */

/**
 * User — Represents an authenticated user's profile and role.
 * Built from profiles table + user_roles table (JOINed in AuthContext).
 * 
 * Role hierarchy: admin > approver > user
 * - admin: Can manage users, view audit logs, approve any request
 * - approver: Can approve requests assigned to them
 * - user: Can create requests only
 */
export interface User {
  id: string;            // UUID from auth.users (matches profiles.id)
  name: string;          // Display name from profiles table
  email: string;         // Email address from profiles table
  role: 'admin' | 'user' | 'approver';  // Highest-privilege role from user_roles
  department?: string;   // Optional department from profiles table
}

/**
 * ApprovalStep — One step in a request's approval chain.
 * Each request has 1+ steps, ordered by order_index.
 * 
 * Status flow: WAITING → APPROVED or RETURNED
 * - WAITING: Not yet acted upon by the approver
 * - APPROVED: Approver has signed (signature_path contains the data URL)
 * - RETURNED: Approver has rejected (note contains the reason)
 * - SKIPPED: Step was bypassed (e.g., admin override — not commonly used)
 */
export interface ApprovalStep {
  id: string;              // UUID primary key
  request_id: string;      // Foreign key to procurement_requests
  order_index: number;     // Position in the chain (0 = first approver)
  approver_id: string;     // UUID of the assigned approver (from auth.users)
  approver_name: string;   // Display name (JOINed from profiles — not stored in this table)
  status: 'WAITING' | 'APPROVED' | 'RETURNED' | 'SKIPPED';
  signed_at?: string;      // ISO timestamp when approved (null if not yet signed)
  signature_path?: string; // Base64 data URL of the drawn signature image
  note?: string;           // Return reason (only populated when status = RETURNED)
}

/**
 * RequestFile — Metadata for an uploaded document attached to a request.
 * The actual file is stored in the 'request-files' storage bucket;
 * this record stores the path/URL and filename for retrieval.
 */
export interface RequestFile {
  id: string;            // UUID primary key
  request_id: string;    // Foreign key to procurement_requests
  path: string;          // Storage URL or path to the file
  filename: string;      // Original filename (e.g., "invoice.pdf")
  type?: string;         // MIME type (e.g., "application/pdf")
}

/**
 * Comment — A message attached to a request, typically a return reason.
 * Created when an approver returns a request for revision.
 * 
 * Comments are directional: from one user TO another user,
 * and optionally linked to a specific step in the approval chain.
 */
export interface Comment {
  id: string;            // UUID primary key
  request_id: string;    // Foreign key to procurement_requests
  from_user_id: string;  // Who wrote the comment (UUID)
  from_name: string;     // Display name (JOINed from profiles)
  to_user_id: string;    // Who the comment is directed to (UUID)
  to_name: string;       // Display name (JOINed from profiles)
  message: string;       // The comment text
  created_at: string;    // ISO timestamp
  step_index?: number;   // Which approval step this comment relates to
}

/**
 * ProcurementRequest — The main entity in the system.
 * Represents a procurement request created by a user that needs
 * to go through an approval chain before being finalized.
 * 
 * Status is automatically managed by a database trigger:
 * - PENDING: Just created, no approvers have acted yet
 * - IN_PROGRESS: At least one approver has signed, but not all
 * - APPROVED: All approvers have signed
 * - RETURNED: At least one approver has returned the request
 * - REJECTED: Request was fully rejected (admin action)
 */
export interface ProcurementRequest {
  id: string;               // UUID primary key
  short_id: string;         // Human-readable ID (e.g., "REQ-0001") — auto-generated
  title: string;            // Request title (e.g., "Office Stationery Q1")
  vendor_name?: string;     // Optional vendor/supplier name
  requester_id: string;     // UUID of the user who created the request
  requester_name?: string;  // Display name (JOINed from profiles)
  status: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'RETURNED' | 'REJECTED';
  created_at: string;       // ISO timestamp of creation
  updated_at: string;       // ISO timestamp of last modification
}

/**
 * RequestDetail — Composite type combining a request with all its related data.
 * Used by the useRequestDetail hook to return everything needed for the detail page.
 */
export interface RequestDetail {
  request: ProcurementRequest;
  files: RequestFile[];
  steps: ApprovalStep[];
  comments?: Comment[];
  placements?: Array<{
    id: string;
    pageNumber: number;
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
    stepIndex?: number;
    approvalStepId?: string;
    requestFileId?: string;
  }>;
}

/** Utility type aliases for status values */
export type RequestStatus = ProcurementRequest['status'];
export type StepStatus = ApprovalStep['status'];
