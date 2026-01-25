-- Add must_change_password flag to profiles table
ALTER TABLE public.profiles 
ADD COLUMN must_change_password boolean NOT NULL DEFAULT false;

-- Allow admins to update must_change_password via edge function
-- (No additional RLS needed since existing update policy covers this)