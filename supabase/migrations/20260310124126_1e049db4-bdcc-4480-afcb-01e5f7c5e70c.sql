
-- Create storage bucket for request files
INSERT INTO storage.buckets (id, name, public) VALUES ('request-files', 'request-files', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'request-files');
CREATE POLICY "Anyone can read files" ON storage.objects FOR SELECT USING (bucket_id = 'request-files');
