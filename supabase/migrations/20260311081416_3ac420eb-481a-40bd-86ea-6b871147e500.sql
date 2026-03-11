
-- Allow admins to read ALL user_roles (needed for admin dashboard user management)
CREATE POLICY "Admins can read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow service role (edge functions) to insert audit logs
-- Update existing audit log insert policy to also allow service_role
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Anyone can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated, service_role
WITH CHECK (true);
