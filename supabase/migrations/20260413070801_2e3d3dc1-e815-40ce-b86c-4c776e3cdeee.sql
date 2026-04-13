-- Add document_type column to procurement_requests
ALTER TABLE public.procurement_requests 
ADD COLUMN document_type text NOT NULL DEFAULT 'payment_requisition';

-- Add a check to validate document type values
CREATE OR REPLACE FUNCTION public.validate_document_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.document_type NOT IN ('payment_requisition', 'memo') THEN
    RAISE EXCEPTION 'Invalid document_type: %. Must be payment_requisition or memo', NEW.document_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_procurement_document_type
BEFORE INSERT OR UPDATE ON public.procurement_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_document_type();