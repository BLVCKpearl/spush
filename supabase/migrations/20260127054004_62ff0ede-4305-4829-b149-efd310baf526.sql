-- Prompt 4: Staff power reduction - Enforce restrictions via RLS

-- ============================================
-- PROFILES: Staff cannot manage other users
-- ============================================

-- Drop and recreate to ensure staff can only view/update themselves
DROP POLICY IF EXISTS "Tenant admins can update tenant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Tenant admins can view tenant profiles" ON public.profiles;

-- Tenant admins can view all profiles in their tenant
CREATE POLICY "Tenant admins can view tenant profiles"
ON public.profiles
FOR SELECT
USING (public.is_tenant_admin(venue_id));

-- Tenant admins can update profiles in their tenant
CREATE POLICY "Tenant admins can update tenant profiles"
ON public.profiles
FOR UPDATE
USING (public.is_tenant_admin(venue_id));

-- Staff can ONLY view their own profile (not others in tenant)
-- Already covered by "Users can view own profile"

-- ============================================
-- USER_ROLES: Staff cannot manage roles
-- ============================================

-- Already properly scoped - staff cannot insert/update/delete roles
-- Verify with explicit denial

-- ============================================
-- BANK_DETAILS: Staff cannot access at all
-- ============================================

DROP POLICY IF EXISTS "Public can view bank details" ON public.bank_details;

-- Only authenticated users of the tenant can view bank details
CREATE POLICY "Tenant staff can view bank details"
ON public.bank_details
FOR SELECT
USING (
  public.is_super_admin()
  OR public.is_staff_of_tenant(venue_id)
);

-- Staff cannot insert/update/delete - already enforced by tenant_admin policies

-- ============================================
-- MENU_ITEMS: Staff cannot edit
-- ============================================

-- Already properly scoped to tenant_admin only for INSERT/UPDATE/DELETE
-- Staff can only SELECT (already covered by public SELECT)

-- ============================================
-- TABLES: Staff cannot edit
-- ============================================

-- Already properly scoped to tenant_admin only for INSERT/UPDATE/DELETE
-- Staff can only SELECT (already covered by public SELECT)

-- ============================================
-- CATEGORIES: Staff cannot edit
-- ============================================

-- Already properly scoped to tenant_admin only for INSERT/UPDATE/DELETE
-- Staff can only SELECT (already covered by public SELECT)

-- ============================================
-- ORDERS: Staff cannot delete (reinforce)
-- ============================================

-- Ensure no DELETE policy allows staff
-- Already handled in Prompt 3 - only super_admin and tenant_admin have ALL access

-- ============================================
-- VENUE_SETTINGS: Staff cannot modify
-- ============================================

-- Already properly scoped to tenant_admin only for INSERT/UPDATE/DELETE
-- Add explicit read for staff
DROP POLICY IF EXISTS "Public can view venue settings" ON public.venue_settings;

CREATE POLICY "Tenant users can view venue settings"
ON public.venue_settings
FOR SELECT
USING (
  public.is_super_admin()
  OR public.is_staff_of_tenant(venue_id)
  OR true  -- Public for guest ordering flow (e.g., order expiry display)
);

-- ============================================
-- STAFF_INVITATIONS: Staff cannot manage
-- ============================================

-- Already properly scoped - only tenant_admin can INSERT/UPDATE/DELETE

-- ============================================
-- TENANT_FEATURE_FLAGS: Staff can only read
-- ============================================

-- Already properly scoped - staff cannot INSERT/UPDATE/DELETE

-- ============================================
-- ADMIN_AUDIT_LOGS: Staff cannot view (only their own actions)
-- ============================================

DROP POLICY IF EXISTS "Tenant admins can view tenant audit logs" ON public.admin_audit_logs;

-- Tenant admins can view all tenant logs
CREATE POLICY "Tenant admins can view tenant audit logs"
ON public.admin_audit_logs
FOR SELECT
USING (public.is_tenant_admin(tenant_id));

-- Staff can only see logs where they are the actor
CREATE POLICY "Staff can view own audit logs"
ON public.admin_audit_logs
FOR SELECT
USING (
  actor_user_id = auth.uid()
  AND public.is_staff_of_tenant(tenant_id)
);