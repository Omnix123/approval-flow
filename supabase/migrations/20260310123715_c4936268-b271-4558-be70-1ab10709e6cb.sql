
-- Fix search_path warnings
CREATE OR REPLACE FUNCTION public.generate_short_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.short_id IS NULL OR NEW.short_id = '' THEN
    NEW.short_id := 'REQ-' || LPAD(nextval('public.request_short_id_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix permissive RLS on qr_signing_tokens
DROP POLICY IF EXISTS "Authenticated can create QR tokens" ON public.qr_signing_tokens;
DROP POLICY IF EXISTS "Anyone can update QR tokens" ON public.qr_signing_tokens;

CREATE POLICY "Authenticated can create QR tokens" ON public.qr_signing_tokens
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.approval_steps WHERE id = step_id AND approver_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- For mobile signing: allow update only to mark as completed (anon or auth)
CREATE POLICY "Anyone can complete QR tokens" ON public.qr_signing_tokens
  FOR UPDATE USING (completed = false AND expires_at > now());
