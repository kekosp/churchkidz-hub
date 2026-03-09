-- Fix 1: Change deny policies on absence_excuses, messages, audit_logs to target 'anon' only
DROP POLICY IF EXISTS "Deny public access to absence_excuses" ON public.absence_excuses;
CREATE POLICY "Deny anon access to absence_excuses"
  ON public.absence_excuses FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Deny public access to messages" ON public.messages;
CREATE POLICY "Deny anon access to messages"
  ON public.messages FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Deny public access to audit_logs" ON public.audit_logs;
CREATE POLICY "Deny anon access to audit_logs"
  ON public.audit_logs FOR ALL TO anon USING (false);

-- Fix 2: Prevent parent privilege escalation via servant_id
DROP POLICY IF EXISTS "Parents can insert own children" ON public.children;
CREATE POLICY "Parents can insert own children"
  ON public.children FOR INSERT TO authenticated
  WITH CHECK (
    parent_id = auth.uid()
    AND (servant_id IS NULL OR has_role(servant_id, 'servant'::app_role))
  );

DROP POLICY IF EXISTS "Parents can update own children" ON public.children;
CREATE POLICY "Parents can update own children"
  ON public.children FOR UPDATE TO authenticated
  USING (parent_id = auth.uid())
  WITH CHECK (
    parent_id = auth.uid()
    AND (servant_id IS NULL OR has_role(servant_id, 'servant'::app_role))
  );

-- Fix 3: Scope parent->servant profile visibility to assigned servants only
DROP POLICY IF EXISTS "Parents can view servant profiles for messaging" ON public.profiles;
CREATE POLICY "Parents can view servant profiles for messaging"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    has_role(profiles.id, 'servant'::app_role)
    AND has_role(auth.uid(), 'parent'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.children
      WHERE children.servant_id = profiles.id
      AND children.parent_id = auth.uid()
    )
  );