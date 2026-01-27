-- 1. Make category creation idempotent by adding UNIQUE constraint on (venue_id, name)
-- First check if constraint exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_venue_id_name_unique'
  ) THEN
    ALTER TABLE public.categories ADD CONSTRAINT categories_venue_id_name_unique UNIQUE (venue_id, name);
  END IF;
END $$;

-- 2. Update create_default_categories to be idempotent (check before insert)
CREATE OR REPLACE FUNCTION public.create_default_categories(p_venue_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use INSERT ... ON CONFLICT to ensure idempotency
  INSERT INTO public.categories (venue_id, name, display_order)
  VALUES
    (p_venue_id, 'Starters', 1),
    (p_venue_id, 'Mains', 2),
    (p_venue_id, 'Drinks', 3),
    (p_venue_id, 'Desserts', 4),
    (p_venue_id, 'Specials', 5)
  ON CONFLICT (venue_id, name) DO NOTHING;
END;
$$;

-- 3. Update handle_new_user_with_tenant to check for is_staff_creation meta flag
-- If is_staff_creation is true, skip venue creation (user is being created by tenant admin)
CREATE OR REPLACE FUNCTION public.handle_new_user_with_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- If this is a staff creation with an assigned tenant, don't create a new venue
  IF is_staff_creation AND assigned_tenant_id IS NOT NULL THEN
    -- Create profile only (venue already exists)
    INSERT INTO public.profiles (user_id, email, display_name, venue_id)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      assigned_tenant_id
    );
    
    -- Role assignment is handled by the edge function, not this trigger
    RETURN NEW;
  END IF;
  
  -- Self-serve signup: create profile first
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  
  -- Generate venue name and slug from user's name or email
  venue_name := COALESCE(
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  ) || '''s Venue';
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
  
  -- Update profile with venue_id
  UPDATE public.profiles 
  SET venue_id = new_venue_id 
  WHERE user_id = NEW.id;
  
  -- Assign user as tenant_admin
  INSERT INTO public.user_roles (user_id, role, tenant_id, tenant_role)
  VALUES (NEW.id, 'admin', new_venue_id, 'tenant_admin');
  
  -- Create default categories for the new venue (idempotent)
  PERFORM public.create_default_categories(new_venue_id);
  
  RETURN NEW;
END;
$$;