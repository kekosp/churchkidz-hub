CREATE OR REPLACE FUNCTION public.validate_child_plain_text_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.full_name IS NOT NULL AND NEW.full_name ~ '[<>]' THEN
    RAISE EXCEPTION 'Child name must be plain text';
  END IF;

  IF NEW.school_grade IS NOT NULL AND NEW.school_grade ~ '[<>]' THEN
    RAISE EXCEPTION 'School grade must be plain text';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_child_plain_text_fields_trigger ON public.children;
CREATE TRIGGER validate_child_plain_text_fields_trigger
BEFORE INSERT OR UPDATE ON public.children
FOR EACH ROW
EXECUTE FUNCTION public.validate_child_plain_text_fields();