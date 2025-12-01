-- Update the handle_new_user function to automatically link parents to children
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_phone TEXT;
  matching_children_count INTEGER;
BEGIN
  -- Insert profile with user data
  INSERT INTO public.profiles (id, full_name, phone_number, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    NEW.email
  );

  -- Get the user's phone number
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone_number', '');

  -- Check if this phone number matches any children's parent_phone
  IF user_phone IS NOT NULL AND user_phone != '' THEN
    -- Count matching children
    SELECT COUNT(*) INTO matching_children_count
    FROM public.children
    WHERE parent_phone = user_phone;

    -- If we find matching children, automatically assign parent role and link children
    IF matching_children_count > 0 THEN
      -- Assign parent role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'parent');

      -- Link all matching children to this parent
      UPDATE public.children
      SET parent_id = NEW.id
      WHERE parent_phone = user_phone AND parent_id IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;