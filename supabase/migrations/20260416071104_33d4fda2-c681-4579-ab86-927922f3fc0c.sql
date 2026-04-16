CREATE TABLE public.request_signature_placements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL,
  request_file_id UUID NOT NULL,
  approval_step_id UUID NOT NULL,
  page_number INTEGER NOT NULL DEFAULT 1,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  width NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT request_signature_placements_page_number_check CHECK (page_number >= 1),
  CONSTRAINT request_signature_placements_width_check CHECK (width > 0),
  CONSTRAINT request_signature_placements_height_check CHECK (height > 0),
  CONSTRAINT request_signature_placements_unique_step_file UNIQUE (request_file_id, approval_step_id)
);

ALTER TABLE public.request_signature_placements ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_request_signature_placements_request_id
  ON public.request_signature_placements (request_id);

CREATE INDEX idx_request_signature_placements_request_file_id
  ON public.request_signature_placements (request_file_id);

CREATE INDEX idx_request_signature_placements_approval_step_id
  ON public.request_signature_placements (approval_step_id);

CREATE OR REPLACE FUNCTION public.validate_request_signature_placement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  file_request_id UUID;
  step_request_id UUID;
BEGIN
  SELECT request_id
  INTO file_request_id
  FROM public.request_files
  WHERE id = NEW.request_file_id;

  IF file_request_id IS NULL THEN
    RAISE EXCEPTION 'Invalid request_file_id: %', NEW.request_file_id;
  END IF;

  SELECT request_id
  INTO step_request_id
  FROM public.approval_steps
  WHERE id = NEW.approval_step_id;

  IF step_request_id IS NULL THEN
    RAISE EXCEPTION 'Invalid approval_step_id: %', NEW.approval_step_id;
  END IF;

  IF file_request_id <> NEW.request_id THEN
    RAISE EXCEPTION 'request_file_id % does not belong to request_id %', NEW.request_file_id, NEW.request_id;
  END IF;

  IF step_request_id <> NEW.request_id THEN
    RAISE EXCEPTION 'approval_step_id % does not belong to request_id %', NEW.approval_step_id, NEW.request_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_request_signature_placement_trigger
BEFORE INSERT OR UPDATE ON public.request_signature_placements
FOR EACH ROW
EXECUTE FUNCTION public.validate_request_signature_placement();

CREATE TRIGGER update_request_signature_placements_updated_at
BEFORE UPDATE ON public.request_signature_placements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Authenticated users can read signature placements"
ON public.request_signature_placements
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.procurement_requests pr
    WHERE pr.id = request_signature_placements.request_id
  )
);

CREATE POLICY "Request owners and admins can create signature placements"
ON public.request_signature_placements
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.procurement_requests pr
    WHERE pr.id = request_signature_placements.request_id
      AND (
        pr.requester_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
      )
  )
);

CREATE POLICY "Request owners approvers and admins can update signature placements"
ON public.request_signature_placements
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.procurement_requests pr
    JOIN public.approval_steps aps ON aps.id = request_signature_placements.approval_step_id
    WHERE pr.id = request_signature_placements.request_id
      AND (
        pr.requester_id = auth.uid()
        OR aps.approver_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.procurement_requests pr
    JOIN public.approval_steps aps ON aps.id = request_signature_placements.approval_step_id
    WHERE pr.id = request_signature_placements.request_id
      AND (
        pr.requester_id = auth.uid()
        OR aps.approver_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
      )
  )
);

CREATE POLICY "Request owners and admins can delete signature placements"
ON public.request_signature_placements
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.procurement_requests pr
    WHERE pr.id = request_signature_placements.request_id
      AND (
        pr.requester_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
      )
  )
);