/**
 * qrSigning.ts — helpers for cross-device signing tokens
 *
 * The QR code must point to a database-backed token, not localStorage. A phone
 * is a different browser/device, so it cannot see localStorage from the desktop.
 */

import { supabase } from '@/integrations/supabase/client';

interface CreateQrSigningTokenParams {
  requestId: string;
  stepId: string;
  approverName: string;
}

/** Create a 15-minute signing token stored in the backend. */
export async function createQrSigningToken({
  requestId,
  stepId,
  approverName,
}: CreateQrSigningTokenParams): Promise<string> {
  const token = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const { error } = await supabase.from('qr_signing_tokens').insert({
    token,
    request_id: requestId,
    step_id: stepId,
    approver_name: approverName,
    completed: false,
  });

  if (error) throw error;
  return token;
}