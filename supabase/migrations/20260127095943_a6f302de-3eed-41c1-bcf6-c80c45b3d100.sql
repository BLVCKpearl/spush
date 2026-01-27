-- Add is_suspended column to super_admins table
ALTER TABLE public.super_admins 
ADD COLUMN is_suspended boolean NOT NULL DEFAULT false;

-- Add suspended_at and suspended_by columns for audit trail
ALTER TABLE public.super_admins 
ADD COLUMN suspended_at timestamp with time zone,
ADD COLUMN suspended_by uuid;

-- Create function to count active (non-suspended) super admins
CREATE OR REPLACE FUNCTION public.count_active_super_admins()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.super_admins
  WHERE is_suspended = false
$$;