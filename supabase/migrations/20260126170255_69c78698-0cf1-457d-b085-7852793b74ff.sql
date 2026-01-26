-- Add venue_id to categories for tenant isolation
ALTER TABLE public.categories ADD COLUMN venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE;

-- Update RLS policies for categories to be tenant-scoped
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
DROP POLICY IF EXISTS "Super admins can manage categories" ON public.categories;

-- Public can view categories (for QR ordering - must filter by venue)
CREATE POLICY "Public can view venue categories" 
  ON public.categories FOR SELECT 
  USING (true);

-- Super admins can manage all categories
CREATE POLICY "Super admins can manage categories" 
  ON public.categories FOR ALL 
  USING (is_super_admin());

-- Tenant admins can insert categories for their venue
CREATE POLICY "Tenant admins can insert categories" 
  ON public.categories FOR INSERT 
  WITH CHECK (is_tenant_admin(venue_id));

-- Tenant admins can update categories for their venue
CREATE POLICY "Tenant admins can update categories" 
  ON public.categories FOR UPDATE 
  USING (is_tenant_admin(venue_id));

-- Tenant admins can delete categories for their venue
CREATE POLICY "Tenant admins can delete categories" 
  ON public.categories FOR DELETE 
  USING (is_tenant_admin(venue_id));