/**
 * admin-create-user — Edge Function
 * 
 * PURPOSE: Allows admin users to create new accounts with specific roles.
 * Uses the Supabase Admin API (service role key) to bypass normal signup flow.
 * 
 * SECURITY:
 * - Validates the caller is an authenticated admin via has_role()
 * - Validates all input with length/format checks
 * - Creates user, profile is auto-created by trigger, then assigns role
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // 1. Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    // Check admin role
    const { data: isAdmin } = await callerClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Unauthorized: Admin role required");

    // 2. Parse and validate input
    const { name, email, password, role, department, positionId } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      throw new Error("Name must be at least 2 characters");
    }
    if (!email || typeof email !== "string") {
      throw new Error("Valid email is required");
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    if (!["user", "approver", "admin"].includes(role)) {
      throw new Error("Invalid role");
    }

    // 3. Create user with admin client
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { name: name.trim(), department: department || null },
    });

    if (createError) throw new Error(createError.message);

    // 4. Update department and position on profile (trigger creates basic profile)
    const profileUpdate: Record<string, any> = {};
    if (department) profileUpdate.department = department;
    if (positionId) profileUpdate.position_id = positionId;
    if (Object.keys(profileUpdate).length > 0) {
      await adminClient.from("profiles").update(profileUpdate).eq("id", newUser.user!.id);
    }

    // 5. Set role (trigger creates 'user' role, update if different)
    if (role !== "user") {
      await adminClient.from("user_roles").update({ role }).eq("user_id", newUser.user!.id);
    }

    // 6. Audit log
    await adminClient.from("audit_logs").insert({
      user_id: caller.id,
      action: "ADMIN_CREATE_USER",
      resource_type: "user",
      resource_id: newUser.user!.id,
      details: { name: name.trim(), email: email.trim(), role },
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
      user_agent: req.headers.get("user-agent") || null,
    });

    return new Response(
      JSON.stringify({ success: true, userId: newUser.user!.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
