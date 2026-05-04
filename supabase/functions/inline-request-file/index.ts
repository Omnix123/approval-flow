/**
 * inline-request-file — Backend Function
 *
 * PURPOSE: Safely returns an attached request file for inline browser viewing.
 * The browser calls this function, receives JSON, creates a local Blob, and then
 * renders that Blob URL. This prevents the UI from ever navigating to raw
 * storage URLs that may carry download-oriented headers.
 *
 * SECURITY:
 * - Requires a signed-in user.
 * - Allows access only to the requester, assigned approvers, or admins.
 * - Uses the private backend key only inside this function to read file bytes.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const toBase64 = async (blob: Blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";

  // Convert in chunks to avoid call-stack issues on larger PDF files.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }

  return btoa(binary);
};

const getStoragePath = (storedPath: string) => {
  if (!/^https?:\/\//i.test(storedPath)) return storedPath;

  const url = new URL(storedPath);
  const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const bucketIndex = segments.findIndex((segment) => segment === "request-files");

  if (bucketIndex === -1 || bucketIndex === segments.length - 1) {
    throw new Error("Invalid request file path");
  }

  return segments.slice(bucketIndex + 1).join("/");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) throw new Error("Not authenticated");

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { fileId } = await req.json();
    if (!fileId || typeof fileId !== "string") throw new Error("Missing file ID");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: file, error: fileError } = await adminClient
      .from("request_files")
      .select("id, request_id, path, filename, type, procurement_requests!inner(requester_id)")
      .eq("id", fileId)
      .single();

    if (fileError || !file) throw new Error("File not found");

    const { data: isAdmin } = await callerClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    const { data: assignedStep } = await adminClient
      .from("approval_steps")
      .select("id")
      .eq("request_id", file.request_id)
      .eq("approver_id", user.id)
      .maybeSingle();

    const requesterId = (file.procurement_requests as { requester_id: string }).requester_id;
    const canView = requesterId === user.id || Boolean(assignedStep) || Boolean(isAdmin);

    if (!canView) throw new Error("Unauthorized");

    const storagePath = getStoragePath(file.path);
    const { data: fileBlob, error: downloadError } = await adminClient.storage
      .from("request-files")
      .download(storagePath);

    if (downloadError || !fileBlob) throw new Error("Unable to load file");

    return new Response(
      JSON.stringify({
        filename: file.filename,
        type: file.type || fileBlob.type || "application/octet-stream",
        base64: await toBase64(fileBlob),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Content-Disposition": `inline; filename="${String(file.filename).replaceAll('"', '')}"`,
        },
      },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Unable to load file" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});