-- Create a function to insert default categories for a new tenant
CREATE OR REPLACE FUNCTION public.create_default_categories(p_venue_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.categories (venue_id, name, display_order)
  VALUES
    (p_venue_id, 'Starters', 1),
    (p_venue_id, 'Mains', 2),
    (p_venue_id, 'Drinks', 3),
    (p_venue_id, 'Desserts', 4),
    (p_venue_id, 'Specials', 5);
END;
$$;

-- Update the handle_new_user_with_tenant trigger function to also create default categories
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
  
  -- Create default categories for the new venue
  PERFORM public.create_default_categories(new_venue_id);
  
  RETURN NEW;
END;
$$;

-- Add onboarding_step column to profiles to track multi-step onboarding
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0;