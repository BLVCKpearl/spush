-- ============================================
-- MULTI-TENANT SAAS ARCHITECTURE MIGRATION (Part 2)
-- Add RLS policies for super_admins and update existing policies
-- ============================================

-- 1. Add RLS policies for super_admins table
CREATE POLICY "Super admins can view all super admins"
  ON public.super_admins FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admins can insert super admins"
  ON public.super_admins FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update super admins"
  ON public.super_admins FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "Super admins can delete super admins"
  ON public.super_admins FOR DELETE
  USING (public.is_super_admin());

-- Allow initial bootstrap: first super admin can be created by anyone if none exist
CREATE POLICY "Allow first super admin bootstrap"
  ON public.super_admins FOR INSERT
  WITH CHECK (NOT EXISTS (SELECT 1 FROM public.super_admins));

-- 2. Update profiles RLS
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Tenant admins can view tenant profiles"
  ON public.profiles FOR SELECT
  USING (public.is_tenant_admin(venue_id));

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "Tenant admins can update tenant profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_tenant_admin(venue_id));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- 3. Update user_roles RLS
DROP POLICY IF EXISTS "User roles are publicly readable" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;

CREATE POLICY "Super admins can manage all user roles"
  ON public.user_roles FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Tenant admins can view tenant user roles"
  ON public.user_roles FOR SELECT
  USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Tenant admins can insert tenant user roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.is_tenant_admin(tenant_id) AND tenant_role != 'tenant_admin');

CREATE POLICY "Tenant admins can update tenant user roles"
  ON public.user_roles FOR UPDATE
  USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Tenant admins can delete tenant user roles"
  ON public.user_roles FOR DELETE
  USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Update venues (tenants) RLS
DROP POLICY IF EXISTS "Venues are publicly readable" ON public.venues;
DROP POLICY IF EXISTS "Admins can insert venues" ON public.venues;
DROP POLICY IF EXISTS "Admins can update venues" ON public.venues;
DROP POLICY IF EXISTS "Admins can delete venues" ON public.venues;

CREATE POLICY "Super admins can manage all venues"
  ON public.venues FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Tenant admins can view own venue"
  ON public.venues FOR SELECT
  USING (public.is_tenant_admin(id));

CREATE POLICY "Tenant admins can update own venue"
  ON public.venues FOR UPDATE
  USING (public.is_tenant_admin(id));

CREATE POLICY "Public can view venues for QR ordering"
  ON public.venues FOR SELECT
  USING (true);

-- 5. Update orders RLS for tenant isolation
DROP POLICY IF EXISTS "Orders are publicly readable by reference" ON public.orders;
DROP POLICY IF EXISTS "Admins and staff can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

CREATE POLICY "Super admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Tenant staff can view tenant orders"
  ON public.orders FOR SELECT
  USING (public.is_tenant_staff(venue_id));

CREATE POLICY "Public can view orders"
  ON public.orders FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Tenant staff can update tenant orders"
  ON public.orders FOR UPDATE
  USING (public.is_tenant_staff(venue_id));

CREATE POLICY "Super admins can delete orders"
  ON public.orders FOR DELETE
  USING (public.is_super_admin());

CREATE POLICY "Tenant admins can delete tenant orders"
  ON public.orders FOR DELETE
  USING (public.is_tenant_admin(venue_id));

-- 6. Update menu_items RLS for tenant isolation
DROP POLICY IF EXISTS "Menu items are publicly readable" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can insert menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can update menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can delete menu items" ON public.menu_items;

CREATE POLICY "Public can view menu items"
  ON public.menu_items FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage all menu items"
  ON public.menu_items FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Tenant admins can insert menu items"
  ON public.menu_items FOR INSERT
  WITH CHECK (public.is_tenant_admin(venue_id));

CREATE POLICY "Tenant admins can update menu items"
  ON public.menu_items FOR UPDATE
  USING (public.is_tenant_admin(venue_id));

CREATE POLICY "Tenant admins can delete menu items"
  ON public.menu_items FOR DELETE
  USING (public.is_tenant_admin(venue_id));

-- 7. Update tables RLS for tenant isolation
DROP POLICY IF EXISTS "Tables are publicly readable" ON public.tables;
DROP POLICY IF EXISTS "Admins can insert tables" ON public.tables;
DROP POLICY IF EXISTS "Admins can update tables" ON public.tables;
DROP POLICY IF EXISTS "Admins can delete tables" ON public.tables;

CREATE POLICY "Public can view tables"
  ON public.tables FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage all tables"
  ON public.tables FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Tenant admins can insert tables"
  ON public.tables FOR INSERT
  WITH CHECK (public.is_tenant_admin(venue_id));

CREATE POLICY "Tenant admins can update tables"
  ON public.tables FOR UPDATE
  USING (public.is_tenant_admin(venue_id));

CREATE POLICY "Tenant admins can delete tables"
  ON public.tables FOR DELETE
  USING (public.is_tenant_admin(venue_id));

-- 8. Update bank_details RLS for tenant isolation
DROP POLICY IF EXISTS "Bank details are publicly readable" ON public.bank_details;
DROP POLICY IF EXISTS "Admins can insert bank details" ON public.bank_details;
DROP POLICY IF EXISTS "Admins can update bank details" ON public.bank_details;
DROP POLICY IF EXISTS "Admins can delete bank details" ON public.bank_details;

CREATE POLICY "Public can view bank details"
  ON public.bank_details FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage all bank details"
  ON public.bank_details FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Tenant admins can insert bank details"
  ON public.bank_details FOR INSERT
  WITH CHECK (public.is_tenant_admin(venue_id));

CREATE POLICY "Tenant admins can update bank details"
  ON public.bank_details FOR UPDATE
  USING (public.is_tenant_admin(venue_id));

CREATE POLICY "Tenant admins can delete bank details"
  ON public.bank_details FOR DELETE
  USING (public.is_tenant_admin(venue_id));

-- 9. Update venue_settings RLS
DROP POLICY IF EXISTS "Venue settings are publicly readable" ON public.venue_settings;
DROP POLICY IF EXISTS "Admins can insert venue settings" ON public.venue_settings;
DROP POLICY IF EXISTS "Admins can update venue settings" ON public.venue_settings;
DROP POLICY IF EXISTS "Admins can delete venue settings" ON public.venue_settings;

CREATE POLICY "Public can view venue settings"
  ON public.venue_settings FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage all venue settings"
  ON public.venue_settings FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Tenant admins can insert venue settings"
  ON public.venue_settings FOR INSERT
  WITH CHECK (public.is_tenant_admin(venue_id));

CREATE POLICY "Tenant admins can update venue settings"
  ON public.venue_settings FOR UPDATE
  USING (public.is_tenant_admin(venue_id));

CREATE POLICY "Tenant admins can delete venue settings"
  ON public.venue_settings FOR DELETE
  USING (public.is_tenant_admin(venue_id));

-- 10. Update admin_audit_logs RLS
DROP POLICY IF EXISTS "Audit logs are publicly readable" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;

CREATE POLICY "Super admins can view all audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Tenant admins can view tenant audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Authenticated users can insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 11. Update categories RLS (categories are global, super-admin only for management)
DROP POLICY IF EXISTS "Categories are publicly readable" ON public.categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;

CREATE POLICY "Public can view categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage categories"
  ON public.categories FOR ALL
  USING (public.is_super_admin());

-- 12. Update payment_confirmations RLS
DROP POLICY IF EXISTS "Payment confirmations are publicly readable" ON public.payment_confirmations;
DROP POLICY IF EXISTS "Staff can create payment confirmations" ON public.payment_confirmations;
DROP POLICY IF EXISTS "Admins can delete payment confirmations" ON public.payment_confirmations;

CREATE POLICY "Public can view payment confirmations"
  ON public.payment_confirmations FOR SELECT
  USING (true);

CREATE POLICY "Tenant staff can create payment confirmations"
  ON public.payment_confirmations FOR INSERT
  WITH CHECK (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND public.is_tenant_staff(o.venue_id)
    )
  );

CREATE POLICY "Super admins can delete payment confirmations"
  ON public.payment_confirmations FOR DELETE
  USING (public.is_super_admin());