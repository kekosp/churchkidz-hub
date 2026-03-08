CREATE POLICY "Servants can update excuses for assigned children"
ON public.absence_excuses FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'servant'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.children
    WHERE children.id = absence_excuses.child_id
    AND children.servant_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'servant'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.children
    WHERE children.id = absence_excuses.child_id
    AND children.servant_id = auth.uid()
  )
);