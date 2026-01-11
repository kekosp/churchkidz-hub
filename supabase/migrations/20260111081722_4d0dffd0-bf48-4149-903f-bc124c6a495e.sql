-- Update handle_new_user function to remove automatic parent linking
-- This prevents attackers from registering with someone else's phone number
-- to gain access to their children's data
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile with user data
  INSERT INTO public.profiles (id, full_name, phone_number, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    NEW.email
  );

  -- SECURITY FIX: Removed automatic parent role assignment and child linking
  -- Previously, this function would automatically:
  -- 1. Assign 'parent' role to users whose phone matches children's parent_phone
  -- 2. Link all matching children to the new user
  -- 
  -- This was a security risk because anyone who knew a family's phone number
  -- could register with it and gain access to their children's data.
  -- 
  -- Parent roles and child linking should now be done manually by admins
  -- through the ManageRoles page to ensure proper verification.

  RETURN NEW;
END;
$function$;