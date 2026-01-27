-- Add is_suspended column to venues for tenant management
ALTER TABLE public.venues 
ADD COLUMN is_suspended boolean NOT NULL DEFAULT false;

-- Add suspended_at timestamp for tracking
ALTER TABLE public.venues 
ADD COLUMN suspended_at timestamp with time zone;

-- Add suspended_by to track who suspended
ALTER TABLE public.venues 
ADD COLUMN suspended_by uuid;