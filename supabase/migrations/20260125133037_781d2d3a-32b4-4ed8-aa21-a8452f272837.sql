-- =====================================================
-- SECURITY FIX: Restrict payment_confirmations to staff only
-- =====================================================

-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Payment confirmations are publicly readable" ON public.payment_confirmations;

-- Create restricted policy for staff/admin only
CREATE POLICY "Staff can view payment confirmations"
  ON public.payment_confirmations
  FOR SELECT
  USING (is_admin_or_staff());

-- =====================================================
-- SECURITY FIX: Make payment-proofs bucket private
-- =====================================================

-- Make the bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'payment-proofs';

-- Drop any existing public read policy
DROP POLICY IF EXISTS "Payment proof images are publicly accessible" ON storage.objects;

-- Create staff-only read policy for payment proofs
CREATE POLICY "Staff can view payment proofs"
  ON storage.objects 
  FOR SELECT
  USING (bucket_id = 'payment-proofs' AND is_admin_or_staff());