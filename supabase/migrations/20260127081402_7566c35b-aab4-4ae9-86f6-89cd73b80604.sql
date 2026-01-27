-- Add is_archived column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- Add archived_at timestamp for tracking when user was archived
ALTER TABLE public.profiles 
ADD COLUMN archived_at timestamp with time zone;

-- Add archived_by to track who archived the user  
ALTER TABLE public.profiles 
ADD COLUMN archived_by uuid;

-- Create index for efficient filtering of non-archived users
CREATE INDEX idx_profiles_is_archived ON public.profiles(is_archived) WHERE is_archived = false;