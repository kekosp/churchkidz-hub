DROP POLICY "Servants can view parent profiles for messaging" ON public.profiles;

CREATE POLICY "Servants can view parent profiles for messaging"
ON public.profiles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'servant'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.children
    WHERE children.parent_id = profiles.id
    AND children.servant_id = auth.uid()
  )
);