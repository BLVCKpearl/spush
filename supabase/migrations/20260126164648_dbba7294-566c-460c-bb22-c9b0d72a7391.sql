-- ============================================
-- MULTI-TENANT SAAS ARCHITECTURE MIGRATION (Part 1)
-- Create types, tables, columns, and functions first
-- ============================================

-- 1. Create new role enum for tenant-scoped roles
CREATE TYPE public.tenant_role AS ENUM ('tenant_admin', 'staff');

-- 2. Create super_admins table (no tenant_id - global access)
CREATE TABLE public.super_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on super_admins (policies added later)
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- 3. Add tenant_id to user_roles table
ALTER TABLE public.user_roles ADD COLUMN tenant_id UUID REFERENCES public.venues(id) ON DELETE CASCADE;

-- 4. Create new column with tenant_role type
ALTER TABLE public.user_roles ADD COLUMN tenant_role public.tenant_role;

-- 5. Add tenant_id to admin_audit_logs
ALTER TABLE public.admin_audit_logs ADD COLUMN tenant_id UUID REFERENCES public.venues(id) ON DELETE SET NULL;

-- 6. Create index for tenant_id lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON public.user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_tenant_id ON public.admin_audit_logs(tenant_id);

-- 7. Create security definer functions for new role system

-- Check if user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = auth.uid()
  )
$$;

-- Check if user is tenant admin for a specific tenant
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = _tenant_id
      AND tenant_role = 'tenant_admin'
  )
$$;

-- Check if user is tenant admin for ANY tenant
CREATE OR REPLACE FUNCTION public.is_any_tenant_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND tenant_role = 'tenant_admin'
  )
$$;

-- Check if user is staff for a specific tenant (includes tenant_admin)
CREATE OR REPLACE FUNCTION public.is_tenant_staff(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = _tenant_id
      AND tenant_role IN ('tenant_admin', 'staff')
  )
$$;

-- Check if user has any tenant access
CREATE OR REPLACE FUNCTION public.has_tenant_access(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = _tenant_id
      AND tenant_role IS NOT NULL
  )
$$;

-- Get user's tenant IDs
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(tenant_id), ARRAY[]::UUID[])
  FROM public.user_roles
  WHERE user_id = auth.uid()
    AND tenant_id IS NOT NULL
$$;

-- Count active tenant admins function
CREATE OR REPLACE FUNCTION public.count_active_tenant_admins(_tenant_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.user_roles ur
  JOIN public.profiles p ON ur.user_id = p.user_id
  WHERE ur.tenant_id = _tenant_id
    AND ur.tenant_role = 'tenant_admin'
    AND p.is_active = true
$$;