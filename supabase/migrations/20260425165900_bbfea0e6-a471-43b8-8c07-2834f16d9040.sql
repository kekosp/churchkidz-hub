DROP POLICY IF EXISTS "Parents can insert own children" ON public.children;
CREATE POLICY "Parents can insert own children"
ON public.children
FOR INSERT
TO authenticated
WITH CHECK (
  parent_id = auth.uid()
  AND servant_id IS NULL
);

DROP POLICY IF EXISTS "Parents can update own children" ON public.children;
CREATE POLICY "Parents can update own children"
ON public.children
FOR UPDATE
TO authenticated
USING (parent_id = auth.uid())
WITH CHECK (
  parent_id = auth.uid()
  AND servant_id IS NULL
);