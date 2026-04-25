DROP POLICY IF EXISTS "Servants can read assigned children" ON public.children;
CREATE POLICY "Servants can read assigned children"
ON public.children
FOR SELECT
TO authenticated
USING (
  servant_id = auth.uid()
  AND public.has_role(auth.uid(), 'servant'::public.app_role)
);

DROP POLICY IF EXISTS "Servants can update assigned children" ON public.children;
CREATE POLICY "Servants can update assigned children"
ON public.children
FOR UPDATE
TO authenticated
USING (
  (
    servant_id = auth.uid()
    AND public.has_role(auth.uid(), 'servant'::public.app_role)
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  (
    servant_id = auth.uid()
    AND public.has_role(auth.uid(), 'servant'::public.app_role)
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Deny public access to bug_reports" ON public.bug_reports;
CREATE POLICY "Deny public access to bug_reports"
ON public.bug_reports
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "Users can create bug reports" ON public.bug_reports;
CREATE POLICY "Users can create bug reports"
ON public.bug_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);