-- Create storage bucket for driver documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('driver-documents', 'driver-documents', true, 5242880, '{image/png,image/jpeg,image/jpg}')
ON CONFLICT (id) DO NOTHING;

-- Allow drivers to read their own documents
CREATE POLICY "driver_read_own_documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow drivers to upload their own documents
CREATE POLICY "driver_insert_own_documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public SELECT (bucket is public)
CREATE POLICY "public_select_driver_documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'driver-documents');

-- Fix missing INSERT policy for driver_documents table
CREATE POLICY "driver_insert_own_doc_record"
ON public.driver_documents FOR INSERT
WITH CHECK (
  driver_id IN (SELECT id FROM public.drivers WHERE profile_id = auth.uid())
);
