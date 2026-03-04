CREATE POLICY "Parents can view servant profiles for messaging"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = profiles.id 
    AND user_roles.role = 'servant'
  )
  AND has_role(auth.uid(), 'parent'::app_role)
);