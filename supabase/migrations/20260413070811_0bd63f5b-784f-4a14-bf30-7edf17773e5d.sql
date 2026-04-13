CREATE OR REPLACE FUNCTION public.validate_document_type()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.document_type NOT IN ('payment_requisition', 'memo') THEN
    RAISE EXCEPTION 'Invalid document_type: %. Must be payment_requisition or memo', NEW.document_type;
  END IF;
  RETURN NEW;
END;
$$;