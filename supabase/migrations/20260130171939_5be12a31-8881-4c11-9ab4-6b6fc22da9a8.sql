-- First, drop all existing storage policies for post-images bucket
DROP POLICY IF EXISTS "Users can view post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete post images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view post images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update post images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete post images" ON storage.objects;
DROP POLICY IF EXISTS "post-images select policy" ON storage.objects;
DROP POLICY IF EXISTS "post-images insert policy" ON storage.objects;
DROP POLICY IF EXISTS "post-images update policy" ON storage.objects;
DROP POLICY IF EXISTS "post-images delete policy" ON storage.objects;

-- Make the bucket private
UPDATE storage.buckets SET public = false WHERE id = 'post-images';

-- Create tenant-isolated storage policies using the existing get_user_tenant_id function
-- The folder structure should be: tenant_id/filename

-- Allow users to view images from their tenant only
CREATE POLICY "Users can view own tenant images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'post-images' AND 
  (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

-- Allow users to upload images to their tenant folder only
CREATE POLICY "Users can upload to own tenant folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images' AND 
  (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

-- Allow users to update images in their tenant folder only
CREATE POLICY "Users can update own tenant images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'post-images' AND 
  (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
)
WITH CHECK (
  bucket_id = 'post-images' AND 
  (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

-- Allow users to delete images in their tenant folder only
CREATE POLICY "Users can delete own tenant images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-images' AND 
  (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);