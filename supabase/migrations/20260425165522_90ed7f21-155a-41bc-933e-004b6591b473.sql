-- Restrict Realtime subscriptions for private staff messages to each user's own channel
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can subscribe to own staff message channel" ON realtime.messages;
CREATE POLICY "Users can subscribe to own staff message channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (topic = ('staff-messages:' || auth.uid()::text));

-- Require the caller to actually hold the servant role before self-assigning as servant on child creation
DROP POLICY IF EXISTS "Servants can insert assigned children" ON public.children;
CREATE POLICY "Servants can insert assigned children"
ON public.children
FOR INSERT
TO authenticated
WITH CHECK (
  (
    servant_id = auth.uid()
    AND public.has_role(auth.uid(), 'servant'::public.app_role)
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Make audit logs immutable through client access
DROP POLICY IF EXISTS "No users can update audit logs" ON public.audit_logs;
CREATE POLICY "No users can update audit logs"
ON public.audit_logs
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "No users can delete audit logs" ON public.audit_logs;
CREATE POLICY "No users can delete audit logs"
ON public.audit_logs
FOR DELETE
TO authenticated
USING (false);

-- Enforce screenshot upload ownership by requiring the first path folder to match the signed-in user
DROP POLICY IF EXISTS "Authenticated users can upload bug screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own bug screenshots" ON storage.objects;
CREATE POLICY "Users can upload own bug screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bug-screenshots'
  AND auth.uid()::text = (storage.foldername(name))[1]
);