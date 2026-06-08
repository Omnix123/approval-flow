/**
 * complete-qr-signing — Backend Function
 *
 * PURPOSE: Completes a QR/mobile signature using the short-lived token as the
 * authorization proof. This makes phone signing work even when the phone is not
 * logged into the web app.
 *
 * SECURITY:
 * - The token must exist, be unexpired, and not already completed.
 * - The signature must be a PNG/JPEG data URL and kept below a safe size.
 * - The function writes the approval step and an audit record using the private
 *   backend key; that key never leaves the backend function.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_SIGNATURE_DATA_URL_LENGTH = 1_500_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") throw new Error("Method not allowed");

    const { token, signatureDataUrl, metadata } = await req.json();

    if (!token || typeof token !== "string") throw new Error("Missing signing token");
    if (
      !signatureDataUrl ||
      typeof signatureDataUrl !== "string" ||
      !/^data:image\/(png|jpeg|jpg);base64,/i.test(signatureDataUrl) ||
      signatureDataUrl.length > MAX_SIGNATURE_DATA_URL_LENGTH
    ) {
      throw new Error("Invalid signature image");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: tokenRow, error: tokenError } = await adminClient
      .from("qr_signing_tokens")
      .select("id, token, request_id, step_id, completed, expires_at")
      .eq("token", token)
      .single();

    if (tokenError || !tokenRow) throw new Error("Invalid signing link");
    if (tokenRow.completed) throw new Error("This signing link was already used");
    if (new Date(tokenRow.expires_at) < new Date()) throw new Error("This signing link has expired");

    const signedAt = new Date().toISOString();

    const { data: step, error: stepLookupError } = await adminClient
      .from("approval_steps")
      .select("id, approver_id, status")
      .eq("id", tokenRow.step_id)
      .single();

    if (stepLookupError || !step) throw new Error("Approval step not found");
    if (step.status !== "WAITING") throw new Error("This approval step is no longer waiting for signature");

    const { error: stepUpdateError } = await adminClient
      .from("approval_steps")
      .update({
        status: "APPROVED",
        signed_at: signedAt,
        signature_path: signatureDataUrl,
      })
      .eq("id", tokenRow.step_id);

    if (stepUpdateError) throw new Error("Unable to approve this step");

    const { error: tokenUpdateError } = await adminClient
      .from("qr_signing_tokens")
      .update({ signature_data_url: signatureDataUrl, completed: true })
      .eq("token", token);

    if (tokenUpdateError) throw new Error("Unable to complete signing token");

    await adminClient.from("audit_logs").insert({
      user_id: step.approver_id,
      action: "QR_SIGN_STEP",
      resource_type: "approval_step",
      resource_id: tokenRow.step_id,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
      user_agent: req.headers.get("user-agent") || null,
      details: {
        request_id: tokenRow.request_id,
        signed_at: signedAt,
        channel: "qr_mobile",
        timezone: metadata?.timezone ?? null,
        screen: metadata?.screen ?? null,
        device_pixel_ratio: metadata?.devicePixelRatio ?? null,
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Unable to complete signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});