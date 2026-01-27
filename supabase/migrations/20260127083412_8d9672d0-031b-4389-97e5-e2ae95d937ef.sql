-- Add is_active column to venues for tracking inactive tenants
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add comment explaining the column
COMMENT ON COLUMN public.venues.is_active IS 'Indicates if tenant is active. False means access has been revoked.';

-- Update RLS policies to consider is_active status where appropriate
-- Note: is_suspended blocks tenant users, is_active=false is a permanent revocation