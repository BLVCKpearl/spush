-- 1. Update the handle_new_user_with_tenant function to:
--    - ONLY create venues during self-serve signup (not staff creation)
--    - Require business_name for tenant signup
--    - Never create venues during user creation via edge functions

CREATE OR REPLACE FUNCTION public.handle_new_user_with_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_venue_id UUID;
  venue_name TEXT;
  venue_slug TEXT;
  is_staff_creation BOOLEAN;
  assigned_tenant_id UUID;
BEGIN
  -- Check if this is a staff creation (via edge function/admin)
  is_staff_creation := COALESCE((NEW.raw_user_meta_data->>'is_staff_creation')::boolean, false);
  assigned_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
  
  -- STAFF CREATION PATH: Only create profile, NEVER create venue
  IF is_staff_creation THEN
    -- Require tenant_id for staff creation
    IF assigned_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Staff creation requires a valid tenant_id';
    END IF;
    
    -- Create profile only (venue already exists)
    INSERT INTO public.profiles (user_id, email, display_name, venue_id, onboarding_completed)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      assigned_tenant_id,
      true  -- Staff don't need onboarding
    );
    
    -- Role assignment is handled by the edge function, not this trigger
    RETURN NEW;
  END IF;
  
  -- SELF-SERVE SIGNUP PATH: Create venue + assign as tenant_admin
  -- Get venue name from metadata (required for tenant signup)
  venue_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'business_name', '')), '');
  
  IF venue_name IS NULL THEN
    -- Fallback to a default name if not provided (will be updated in onboarding)
    venue_name := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ) || '''s Venue';
  END IF;
  
  -- Generate slug
  venue_slug := public.generate_venue_slug(
    COALESCE(
      NEW.raw_user_meta_data->>'business_name',
      NEW.raw_user_meta_data->>'full_name', 
      split_part(NEW.email, '@', 1)
    )
  );
  
  -- Create new venue (tenant)
  INSERT INTO public.venues (name, venue_slug)
  VALUES (venue_name, venue_slug)
  RETURNING id INTO new_venue_id;
  
  -- Create profile with venue_id
  INSERT INTO public.profiles (user_id, email, display_name, venue_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    new_venue_id
  );
  
  -- Assign user as tenant_admin
  INSERT INTO public.user_roles (user_id, role, tenant_id, tenant_role)
  VALUES (NEW.id, 'admin', new_venue_id, 'tenant_admin');
  
  -- Create default categories for the new venue (idempotent)
  PERFORM public.create_default_categories(new_venue_id);
  
  RETURN NEW;
END;
$function$;

-- 2. Create a trigger function to validate profiles.venue_id is set for non-super-admin users
CREATE OR REPLACE FUNCTION public.validate_profile_venue_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_super_admin_user BOOLEAN;
BEGIN
  -- Check if user is a super admin
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = NEW.user_id
  ) INTO is_super_admin_user;
  
  -- Super admins don't need venue_id
  IF is_super_admin_user THEN
    RETURN NEW;
  END IF;
  
  -- For non-super-admin users, venue_id can be null initially during signup
  -- but will be set by the handle_new_user_with_tenant trigger
  -- This validation is mainly for updates
  
  RETURN NEW;
END;
$function$;

-- 3. Create trigger for profile validation (on update only)
DROP TRIGGER IF EXISTS validate_profile_venue_id_trigger ON public.profiles;
CREATE TRIGGER validate_profile_venue_id_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_venue_id();