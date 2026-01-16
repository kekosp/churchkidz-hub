-- Create bug_reports table
CREATE TABLE public.bug_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  description TEXT NOT NULL,
  steps_to_reproduce TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  browser_info TEXT,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to submit bug reports
CREATE POLICY "Users can create bug reports"
ON public.bug_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own bug reports
CREATE POLICY "Users can view own bug reports"
ON public.bug_reports
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all bug reports
CREATE POLICY "Admins can view all bug reports"
ON public.bug_reports
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update bug reports
CREATE POLICY "Admins can update bug reports"
ON public.bug_reports
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_bug_reports_updated_at
BEFORE UPDATE ON public.bug_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for bug report screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bug-screenshots', 'bug-screenshots', true);

-- Storage policies for bug screenshots
CREATE POLICY "Authenticated users can upload bug screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'bug-screenshots' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view bug screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'bug-screenshots');

CREATE POLICY "Users can delete their own bug screenshots"
ON storage.objects
FOR DELETE
USING (bucket_id = 'bug-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);