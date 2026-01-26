-- Update RLS policies for tables to allow public read access
-- Since we're removing authentication, admin pages need to read tables without auth

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can read tables" ON public.tables;
DROP POLICY IF EXISTS "Admins can insert tables" ON public.tables;
DROP POLICY IF EXISTS "Admins can update tables" ON public.tables;
DROP POLICY IF EXISTS "Admins can delete tables" ON public.tables;

-- Create new permissive policies (no auth required)
CREATE POLICY "Tables are publicly readable" 
ON public.tables FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert tables" 
ON public.tables FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update tables" 
ON public.tables FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete tables" 
ON public.tables FOR DELETE 
USING (true);

-- Also update bank_details policies since admin pages need to read them
DROP POLICY IF EXISTS "Admin and staff can read bank details" ON public.bank_details;
DROP POLICY IF EXISTS "Admins can insert bank details" ON public.bank_details;
DROP POLICY IF EXISTS "Admins can update bank details" ON public.bank_details;
DROP POLICY IF EXISTS "Admins can delete bank details" ON public.bank_details;

CREATE POLICY "Bank details are publicly readable" 
ON public.bank_details FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert bank details" 
ON public.bank_details FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update bank details" 
ON public.bank_details FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete bank details" 
ON public.bank_details FOR DELETE 
USING (true);

-- Update user_roles policies for roles management page
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "User roles are publicly readable" 
ON public.user_roles FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert user roles" 
ON public.user_roles FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update user roles" 
ON public.user_roles FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete user roles" 
ON public.user_roles FOR DELETE 
USING (true);

-- Update profiles policies for user management
DROP POLICY IF EXISTS "Admins and staff can view profiles" ON public.profiles;

CREATE POLICY "Profiles are publicly readable" 
ON public.profiles FOR SELECT 
USING (true);

-- Update admin_audit_logs policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;

CREATE POLICY "Audit logs are publicly readable" 
ON public.admin_audit_logs FOR SELECT 
USING (true);

-- Update payment_confirmations policies
DROP POLICY IF EXISTS "Staff can view payment confirmations" ON public.payment_confirmations;
DROP POLICY IF EXISTS "Admins and staff can create payment confirmations" ON public.payment_confirmations;
DROP POLICY IF EXISTS "Admins can delete payment confirmations" ON public.payment_confirmations;

CREATE POLICY "Payment confirmations are publicly readable" 
ON public.payment_confirmations FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create payment confirmations" 
ON public.payment_confirmations FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete payment confirmations" 
ON public.payment_confirmations FOR DELETE 
USING (true);