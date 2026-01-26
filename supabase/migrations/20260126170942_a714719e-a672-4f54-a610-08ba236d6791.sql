-- Function to generate unique venue slug from name or email
CREATE OR REPLACE FUNCTION public.generate_venue_slug(base_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  slug TEXT;
  counter INTEGER := 0;
  exists_check BOOLEAN;
BEGIN
  -- Generate base slug: lowercase, replace spaces/special chars with hyphens
  slug := lower(regexp_replace(base_text, '[^a-zA-Z0-9]+', '-', 'g'));
  slug := regexp_replace(slug, '^-|-$', '', 'g'); -- trim leading/trailing hyphens
  slug := substring(slug FROM 1 FOR 50); -- limit length
  
  -- Ensure uniqueness
  LOOP
    IF counter = 0 THEN
      SELECT EXISTS(SELECT 1 FROM public.venues WHERE venue_slug = slug) INTO exists_check;
    ELSE
      SELECT EXISTS(SELECT 1 FROM public.venues WHERE venue_slug = slug || '-' || counter) INTO exists_check;
    END IF;
    
    EXIT WHEN NOT exists_check;
    counter := counter + 1;
  END LOOP;
  
  IF counter > 0 THEN
    slug := slug || '-' || counter;
  END IF;
  
  RETURN slug;
END;
$$;

-- Function to create tenant and assign admin role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_with_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_venue_id UUID;
  venue_name TEXT;
  venue_slug TEXT;
BEGIN
  -- Create profile first
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
  
  RETURN NEW;
END;
$$;

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_with_tenant();

-- Add onboarding_completed flag to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Add onboarding_completed_at timestamp
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone;