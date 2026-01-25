-- Add venue_id to bank_details for per-venue bank accounts
ALTER TABLE public.bank_details 
ADD COLUMN venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_bank_details_venue_id ON public.bank_details(venue_id);

-- Update RLS policy to allow reading venue-specific bank details
DROP POLICY IF EXISTS "Bank details are publicly readable when active" ON public.bank_details;
CREATE POLICY "Bank details are publicly readable when active" 
ON public.bank_details 
FOR SELECT 
USING (is_active = true);