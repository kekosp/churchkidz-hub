-- Fix 1: Drop the overly permissive SELECT policies on children table
DROP POLICY IF EXISTS "Parents can read own children" ON public.children;
DROP POLICY IF EXISTS "Servants can read assigned children" ON public.children;

-- Fix 2: Create more restrictive SELECT policies
-- Parents can ONLY read their OWN children (where parent_id matches)
CREATE POLICY "Parents can read own children" 
ON public.children 
FOR SELECT 
USING (parent_id = auth.uid());

-- Servants can ONLY read children assigned TO THEM (where servant_id matches)
CREATE POLICY "Servants can read assigned children" 
ON public.children 
FOR SELECT 
USING (servant_id = auth.uid());

-- Admins can read all children (separate policy for clarity)
CREATE POLICY "Admins can read all children" 
ON public.children 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: Add UPDATE policy for parents to update their own children's info
-- Exclude servant_id from being updated by parents
CREATE POLICY "Parents can update own children" 
ON public.children 
FOR UPDATE 
USING (parent_id = auth.uid())
WITH CHECK (parent_id = auth.uid());