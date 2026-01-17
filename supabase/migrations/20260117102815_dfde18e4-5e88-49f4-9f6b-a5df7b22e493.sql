-- Fix 1: Make bug-screenshots bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'bug-screenshots';

-- Fix 2: Drop the overly permissive SELECT policy on storage
DROP POLICY IF EXISTS "Anyone can view bug screenshots" ON storage.objects;

-- Fix 3: Create restricted SELECT policy for bug screenshots (owners and admins only)
CREATE POLICY "Bug report owners and admins can view screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'bug-screenshots' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Fix 4: Add explicit DELETE policy for children table (admins only)
CREATE POLICY "Only admins can delete children"
ON public.children
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));