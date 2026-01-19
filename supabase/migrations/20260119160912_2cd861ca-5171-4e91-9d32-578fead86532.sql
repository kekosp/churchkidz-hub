-- Add explicit DENY policies for anonymous users to protect sensitive tables
-- This provides defense-in-depth even though RLS is enabled

-- Deny all operations on children table for anonymous users
CREATE POLICY "Deny public access to children" 
ON public.children 
FOR ALL 
TO anon 
USING (false);

-- Also protect related sensitive tables from anonymous access
CREATE POLICY "Deny public access to attendance" 
ON public.attendance 
FOR ALL 
TO anon 
USING (false);

CREATE POLICY "Deny public access to tayo_transactions" 
ON public.tayo_transactions 
FOR ALL 
TO anon 
USING (false);

CREATE POLICY "Deny public access to servant_attendance" 
ON public.servant_attendance 
FOR ALL 
TO anon 
USING (false);

CREATE POLICY "Deny public access to profiles" 
ON public.profiles 
FOR ALL 
TO anon 
USING (false);

CREATE POLICY "Deny public access to user_roles" 
ON public.user_roles 
FOR ALL 
TO anon 
USING (false);

CREATE POLICY "Deny public access to bug_reports" 
ON public.bug_reports 
FOR ALL 
TO anon 
USING (false);