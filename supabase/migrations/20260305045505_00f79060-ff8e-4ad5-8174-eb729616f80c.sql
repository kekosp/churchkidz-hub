-- Allow servants to view parent profiles for messaging
CREATE POLICY "Servants can view parent profiles for messaging"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(profiles.id, 'parent'::app_role)
  AND has_role(auth.uid(), 'servant'::app_role)
);