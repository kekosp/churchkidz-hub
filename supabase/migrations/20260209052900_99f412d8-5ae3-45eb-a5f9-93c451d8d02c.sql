
-- Add 'child' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'child';

-- Add child_user_id column to children table to link a child's auth account
ALTER TABLE public.children
ADD COLUMN IF NOT EXISTS child_user_id uuid UNIQUE;

-- RLS: Children (child role) can read their own record
CREATE POLICY "Child users can read own child record"
ON public.children
FOR SELECT
USING (child_user_id = auth.uid());

-- RLS: Child users can read their own role
-- (already covered by "Users can read own role" policy)

-- RLS: Child users can read their own attendance
CREATE POLICY "Child users can read own attendance"
ON public.attendance
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM children
    WHERE children.id = attendance.child_id
    AND children.child_user_id = auth.uid()
  )
);

-- RLS: Child users can read their own tayo transactions
CREATE POLICY "Child users can read own tayo transactions"
ON public.tayo_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM children
    WHERE children.id = tayo_transactions.child_id
    AND children.child_user_id = auth.uid()
  )
);
