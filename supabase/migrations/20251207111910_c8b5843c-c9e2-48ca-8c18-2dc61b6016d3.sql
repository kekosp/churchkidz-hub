-- Create tayo_transactions table to track points history
CREATE TABLE public.tayo_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tayo_transactions ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can do everything with tayo"
ON public.tayo_transactions
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Servants can manage points for assigned children
CREATE POLICY "Servants can manage tayo for assigned children"
ON public.tayo_transactions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.children
    WHERE children.id = tayo_transactions.child_id
    AND (children.servant_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.children
    WHERE children.id = tayo_transactions.child_id
    AND (children.servant_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Parents can view points for their children
CREATE POLICY "Parents can view tayo for own children"
ON public.tayo_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.children
    WHERE children.id = tayo_transactions.child_id
    AND children.parent_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX idx_tayo_transactions_child_id ON public.tayo_transactions(child_id);
CREATE INDEX idx_tayo_transactions_created_at ON public.tayo_transactions(created_at DESC);