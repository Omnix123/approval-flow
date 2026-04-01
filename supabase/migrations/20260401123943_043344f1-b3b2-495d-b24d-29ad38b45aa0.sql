
-- Create positions table for custom role names
CREATE TABLE public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  access_level text NOT NULL DEFAULT 'user' CHECK (access_level IN ('admin', 'approver', 'user')),
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read positions
CREATE POLICY "Authenticated users can read positions" ON public.positions
  FOR SELECT TO authenticated USING (true);

-- Only admins can manage positions
CREATE POLICY "Admins can manage positions" ON public.positions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Add position field to profiles
ALTER TABLE public.profiles ADD COLUMN position_id uuid REFERENCES public.positions(id);

-- Insert default positions
INSERT INTO public.positions (name, access_level, description) VALUES
  ('Administrator', 'admin', 'Full system access'),
  ('Director', 'approver', 'Can approve documents'),
  ('Manager', 'approver', 'Can approve documents'),
  ('Officer', 'user', 'Can create and submit requests'),
  ('Clerk', 'user', 'Can create and submit requests');
