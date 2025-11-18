-- Allow servants and admins to view all servant roles
CREATE POLICY "Servants and admins can view all servant roles" ON public.user_roles
FOR SELECT
USING (
  role = 'servant'::app_role 
  AND (has_role(auth.uid(), 'servant'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Allow servants and admins to view all servant profiles
CREATE POLICY "Servants and admins can view servant profiles" ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = profiles.id 
    AND user_roles.role = 'servant'::app_role
  )
  AND (has_role(auth.uid(), 'servant'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);