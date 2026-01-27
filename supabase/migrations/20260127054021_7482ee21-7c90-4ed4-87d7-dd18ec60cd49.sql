-- Prompt 5: Payment confirmation safety

-- ============================================
-- PAYMENT_CONFIRMATIONS: Secure all operations
-- ============================================

-- Drop existing policies to rebuild with proper controls
DROP POLICY IF EXISTS "Tenant staff can create payment confirmations" ON public.payment_confirmations;
DROP POLICY IF EXISTS "Super admins can delete payment confirmations" ON public.payment_confirmations;
DROP POLICY IF EXISTS "Payment confirmations are tenant-scoped readable" ON public.payment_confirmations;

-- Super admins have full access
CREATE POLICY "Super admins have full confirmation access"
ON public.payment_confirmations
FOR ALL
USING (public.is_super_admin());

-- Tenant admins can manage confirmations for their orders
CREATE POLICY "Tenant admins can manage confirmations"
ON public.payment_confirmations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = payment_confirmations.order_id
    AND public.is_tenant_admin(o.venue_id)
  )
);

-- Staff can INSERT confirmations for their tenant's orders (not update/delete)
CREATE POLICY "Staff can create confirmations"
ON public.payment_confirmations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = payment_confirmations.order_id
    AND public.is_staff_of_tenant(o.venue_id)
  )
);

-- Staff can view confirmations for their tenant's orders
CREATE POLICY "Staff can view confirmations"
ON public.payment_confirmations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = payment_confirmations.order_id
    AND public.is_staff_of_tenant(o.venue_id)
  )
);

-- Public can view confirmation status for order tracking
CREATE POLICY "Public can view confirmation status"
ON public.payment_confirmations
FOR SELECT
USING (true);

-- ============================================
-- Prevent duplicate confirmations via unique constraint
-- ============================================

-- Add unique constraint on order_id to prevent duplicates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payment_confirmations_order_id_unique'
  ) THEN
    ALTER TABLE public.payment_confirmations
    ADD CONSTRAINT payment_confirmations_order_id_unique UNIQUE (order_id);
  END IF;
END $$;

-- ============================================
-- Add trigger to validate confirmed_by is the actual user
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_payment_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_venue_id UUID;
BEGIN
  -- Get the venue_id for this order
  SELECT venue_id INTO order_venue_id 
  FROM public.orders 
  WHERE id = NEW.order_id;
  
  -- Ensure confirmed_by matches the authenticated user
  IF NEW.confirmed_by != auth.uid() THEN
    RAISE EXCEPTION 'confirmed_by must match the authenticated user';
  END IF;
  
  -- Ensure the user has permission (staff or admin of the order's tenant)
  IF NOT public.is_staff_of_tenant(order_venue_id) AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only tenant staff or super admins can confirm payments';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_payment_confirmation_trigger ON public.payment_confirmations;

CREATE TRIGGER validate_payment_confirmation_trigger
BEFORE INSERT ON public.payment_confirmations
FOR EACH ROW
EXECUTE FUNCTION public.validate_payment_confirmation();