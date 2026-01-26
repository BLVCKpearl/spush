-- ============================================
-- SECURITY: Tighten RLS policies for role-based access
-- ============================================

-- Drop overly permissive policies and replace with role-based ones

-- ============================================
-- BANK_DETAILS: Only ADMIN can manage
-- ============================================
DROP POLICY IF EXISTS "Anyone can delete bank details" ON public.bank_details;
DROP POLICY IF EXISTS "Anyone can insert bank details" ON public.bank_details;
DROP POLICY IF EXISTS "Anyone can update bank details" ON public.bank_details;

CREATE POLICY "Admins can insert bank details"
  ON public.bank_details FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update bank details"
  ON public.bank_details FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete bank details"
  ON public.bank_details FOR DELETE
  USING (public.is_admin());

-- ============================================
-- TABLES: Only ADMIN can manage
-- ============================================
DROP POLICY IF EXISTS "Anyone can delete tables" ON public.tables;
DROP POLICY IF EXISTS "Anyone can insert tables" ON public.tables;
DROP POLICY IF EXISTS "Anyone can update tables" ON public.tables;

CREATE POLICY "Admins can insert tables"
  ON public.tables FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update tables"
  ON public.tables FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete tables"
  ON public.tables FOR DELETE
  USING (public.is_admin());

-- ============================================
-- USER_ROLES: Only ADMIN can manage roles
-- ============================================
DROP POLICY IF EXISTS "Anyone can delete user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone can update user roles" ON public.user_roles;

CREATE POLICY "Admins can insert user roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update user roles"
  ON public.user_roles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete user roles"
  ON public.user_roles FOR DELETE
  USING (public.is_admin());

-- ============================================
-- PROFILES: Users can update own, ADMIN can update all
-- ============================================
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin());

-- ============================================
-- ORDERS: Tighten update to ADMIN/STAFF only
-- ============================================
-- SELECT is already public (for guest tracking)
-- INSERT is already public (guests create orders)
-- UPDATE should be ADMIN/STAFF only (already correct)
-- DELETE should be ADMIN only (already correct)

-- ============================================
-- PAYMENT_CONFIRMATIONS: Only ADMIN/STAFF can insert
-- ============================================
DROP POLICY IF EXISTS "Anyone can create payment confirmations" ON public.payment_confirmations;
DROP POLICY IF EXISTS "Anyone can delete payment confirmations" ON public.payment_confirmations;

CREATE POLICY "Staff can create payment confirmations"
  ON public.payment_confirmations FOR INSERT
  WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "Admins can delete payment confirmations"
  ON public.payment_confirmations FOR DELETE
  USING (public.is_admin());

-- ============================================
-- ADMIN_AUDIT_LOGS: Only system/admin can insert
-- ============================================
DROP POLICY IF EXISTS "System can insert audit logs" ON public.admin_audit_logs;

CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  WITH CHECK (public.is_admin());