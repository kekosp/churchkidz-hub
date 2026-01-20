-- Fix: Create a view that masks sensitive parent contact information for servants
-- Servants should only see child's name and basic info needed for their role
-- Parents and admins get full access to all fields

-- Create a function to mask phone numbers (show only last 4 digits)
CREATE OR REPLACE FUNCTION public.mask_phone(phone_number text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN phone_number IS NULL OR length(phone_number) < 4 THEN '****'
    ELSE '****' || right(phone_number, 4)
  END
$$;

-- Create a secure view for children data that respects privacy
-- This view masks sensitive parent contact info for servants
CREATE OR REPLACE VIEW public.children_safe_view
WITH (security_invoker=on) AS
SELECT 
  id,
  full_name,
  date_of_birth,
  school_grade,
  attendance_status,
  notes,
  servant_id,
  parent_id,
  created_at,
  updated_at,
  -- Mask sensitive fields based on user role
  CASE 
    WHEN has_role(auth.uid(), 'admin') THEN parent_name
    WHEN parent_id = auth.uid() THEN parent_name
    ELSE 'Parent of ' || split_part(full_name, ' ', 1)
  END AS parent_name,
  CASE 
    WHEN has_role(auth.uid(), 'admin') THEN parent_phone
    WHEN parent_id = auth.uid() THEN parent_phone
    ELSE mask_phone(parent_phone)
  END AS parent_phone,
  CASE 
    WHEN has_role(auth.uid(), 'admin') THEN address
    WHEN parent_id = auth.uid() THEN address
    ELSE NULL
  END AS address
FROM public.children;