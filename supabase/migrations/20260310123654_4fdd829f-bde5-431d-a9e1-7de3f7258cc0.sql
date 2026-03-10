
-- 1. Create enum types
CREATE TYPE public.request_status AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED', 'RETURNED', 'REJECTED');
CREATE TYPE public.step_status AS ENUM ('WAITING', 'APPROVED', 'RETURNED', 'SKIPPED');
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'approver');

-- 2. Profiles table (auto-created on signup)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- 3. User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. Procurement requests table
CREATE TABLE public.procurement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  vendor_name TEXT,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status request_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.procurement_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read requests" ON public.procurement_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create requests" ON public.procurement_requests FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Requesters can update own requests" ON public.procurement_requests FOR UPDATE TO authenticated USING (requester_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 5. Approval steps table
CREATE TABLE public.approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.procurement_requests(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  approver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status step_status NOT NULL DEFAULT 'WAITING',
  signed_at TIMESTAMPTZ,
  signature_path TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read steps" ON public.approval_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Request owner can create steps" ON public.approval_steps FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.procurement_requests WHERE id = request_id AND requester_id = auth.uid())
);
CREATE POLICY "Approver or admin can update steps" ON public.approval_steps FOR UPDATE TO authenticated USING (
  approver_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);

-- 6. Request files table
CREATE TABLE public.request_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.procurement_requests(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  filename TEXT NOT NULL,
  type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.request_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read files" ON public.request_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Request owner can create files" ON public.request_files FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.procurement_requests WHERE id = request_id AND requester_id = auth.uid())
);

-- 7. Comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.procurement_requests(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  step_index INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read comments" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (from_user_id = auth.uid());

-- 8. Audit logs table (comprehensive security trail)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 9. QR signing tokens table (fixes cross-device issue)
CREATE TABLE public.qr_signing_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  request_id UUID NOT NULL REFERENCES public.procurement_requests(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.approval_steps(id) ON DELETE CASCADE,
  approver_name TEXT NOT NULL,
  signature_data_url TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.qr_signing_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read QR tokens" ON public.qr_signing_tokens FOR SELECT USING (true);
CREATE POLICY "Authenticated can create QR tokens" ON public.qr_signing_tokens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update QR tokens" ON public.qr_signing_tokens FOR UPDATE USING (true);

-- 10. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );
  -- Default role is 'user'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Auto-generate short_id sequence
CREATE SEQUENCE IF NOT EXISTS public.request_short_id_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.generate_short_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.short_id IS NULL OR NEW.short_id = '' THEN
    NEW.short_id := 'REQ-' || LPAD(nextval('public.request_short_id_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_short_id
  BEFORE INSERT ON public.procurement_requests
  FOR EACH ROW EXECUTE FUNCTION public.generate_short_id();

-- 12. Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.procurement_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 13. Function to update request status based on steps
CREATE OR REPLACE FUNCTION public.update_request_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  all_approved BOOLEAN;
  any_returned BOOLEAN;
  any_approved BOOLEAN;
BEGIN
  SELECT 
    bool_and(status = 'APPROVED'),
    bool_or(status = 'RETURNED'),
    bool_or(status = 'APPROVED')
  INTO all_approved, any_returned, any_approved
  FROM public.approval_steps
  WHERE request_id = NEW.request_id;

  IF all_approved THEN
    UPDATE public.procurement_requests SET status = 'APPROVED' WHERE id = NEW.request_id;
  ELSIF any_returned THEN
    UPDATE public.procurement_requests SET status = 'RETURNED' WHERE id = NEW.request_id;
  ELSIF any_approved THEN
    UPDATE public.procurement_requests SET status = 'IN_PROGRESS' WHERE id = NEW.request_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_request_status_on_step_change
  AFTER UPDATE ON public.approval_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_request_status();

-- 14. Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_steps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.procurement_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_signing_tokens;
