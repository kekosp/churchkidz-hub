-- Fix function search path mutable warning
CREATE OR REPLACE FUNCTION public.mask_phone(phone_number text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE 
    WHEN phone_number IS NULL OR length(phone_number) < 4 THEN '****'
    ELSE '****' || right(phone_number, 4)
  END
$$;