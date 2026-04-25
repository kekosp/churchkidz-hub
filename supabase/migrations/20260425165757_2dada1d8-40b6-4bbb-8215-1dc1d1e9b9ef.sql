DROP POLICY IF EXISTS "Users can update their own bug screenshots" ON storage.objects;
CREATE POLICY "Users can update their own bug screenshots"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bug-screenshots'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'bug-screenshots'
  AND auth.uid()::text = (storage.foldername(name))[1]
);