-- Drop the broken policy
DROP POLICY IF EXISTS "Parents can view servant profiles for messaging" ON public.profiles;

-- Recreate using has_role security definer function (bypasses user_roles RLS)
CREATE POLICY "Parents can view servant profiles for messaging"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(profiles.id, 'servant'::app_role)
  AND has_role(auth.uid(), 'parent'::app_role)
);