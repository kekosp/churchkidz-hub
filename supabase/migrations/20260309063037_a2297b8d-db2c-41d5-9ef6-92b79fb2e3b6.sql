
-- Fix 1: children_safe_view - enable security_invoker so underlying RLS applies
ALTER VIEW public.children_safe_view SET (security_invoker = on);

-- Fix 2: bug-screenshots bucket - make private
UPDATE storage.buckets SET public = false WHERE id = 'bug-screenshots';

-- Fix 3: Drop open SELECT policy on bug-screenshots, replace with admin-only
DROP POLICY IF EXISTS "Anyone can view bug screenshots" ON storage.objects;
CREATE POLICY "Admins can view bug screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bug-screenshots' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Fix 4: Drop overly permissive audit_logs INSERT policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Only system triggers can insert audit logs" ON public.audit_logs;
-- Re-create strict policy: only admins can directly insert (triggers bypass RLS via SECURITY DEFINER)
CREATE POLICY "Only admins can insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
