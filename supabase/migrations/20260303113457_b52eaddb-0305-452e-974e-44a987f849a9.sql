
-- Fix: Replace the overly permissive insert policy with a proper one
-- The audit_log_trigger function runs as SECURITY DEFINER so it bypasses RLS anyway
-- We can restrict the direct insert to admins only
DROP POLICY "System can insert audit logs" ON public.audit_logs;

CREATE POLICY "Only system triggers can insert audit logs" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
