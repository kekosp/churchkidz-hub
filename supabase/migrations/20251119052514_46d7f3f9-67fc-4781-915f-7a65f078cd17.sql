-- Add constraint to ensure children records always have ownership
-- Either parent_id OR servant_id (or both) must be NOT NULL
ALTER TABLE public.children 
ADD CONSTRAINT children_ownership_check 
CHECK (parent_id IS NOT NULL OR servant_id IS NOT NULL);