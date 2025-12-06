-- Create servant attendance table
CREATE TABLE public.servant_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servant_id UUID NOT NULL,
  service_date DATE NOT NULL,
  present BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(servant_id, service_date)
);

-- Add foreign key to profiles
ALTER TABLE public.servant_attendance 
ADD CONSTRAINT servant_attendance_servant_id_fkey 
FOREIGN KEY (servant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.servant_attendance ENABLE ROW LEVEL SECURITY;

-- Only admins can manage servant attendance
CREATE POLICY "Admins can do everything with servant attendance" 
ON public.servant_attendance 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Servants can view their own attendance
CREATE POLICY "Servants can view own attendance" 
ON public.servant_attendance 
FOR SELECT 
USING (servant_id = auth.uid());