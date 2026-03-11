
-- Tighten audit log insert policy: authenticated must set their own user_id, service_role can insert anything
DROP POLICY IF EXISTS "Anyone can insert audit logs" ON public.audit_logs;

CREATE POLICY "Authenticated users can insert own audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs
FOR INSERT
TO service_role
WITH CHECK (true);
