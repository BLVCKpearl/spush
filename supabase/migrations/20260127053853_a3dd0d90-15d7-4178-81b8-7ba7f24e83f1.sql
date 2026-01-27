-- Prompt 1: Replace generic role helpers with tenant-scoped functions

-- First, create a tenant-scoped staff check function (rename existing for clarity)
CREATE OR REPLACE FUNCTION public.is_staff_of_tenant(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = _tenant_id
      AND tenant_role IN ('tenant_admin', 'staff')
  )
$$;

-- Update order_events policies to use tenant-scoped checks
DROP POLICY IF EXISTS "Admins and staff can create order events" ON public.order_events;

CREATE POLICY "Tenant staff can create order events"
ON public.order_events
FOR INSERT
WITH CHECK (
  -- Allow system-generated events (no actor) OR staff of the order's tenant
  actor_id IS NULL 
  OR public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_events.order_id
    AND public.is_staff_of_tenant(o.venue_id)
  )
);

-- Update payment_confirmations insert policy to be tenant-scoped
DROP POLICY IF EXISTS "Tenant staff can create payment confirmations" ON public.payment_confirmations;

CREATE POLICY "Tenant staff can create payment confirmations"
ON public.payment_confirmations
FOR INSERT
WITH CHECK (
  public.is_super_admin() 
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = payment_confirmations.order_id
    AND public.is_staff_of_tenant(o.venue_id)
  )
);

-- Update order_items policies to use tenant-scoped functions
DROP POLICY IF EXISTS "Admins can delete order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can update order items" ON public.order_items;

CREATE POLICY "Tenant admins can delete order items"
ON public.order_items
FOR DELETE
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
    AND public.is_tenant_admin(o.venue_id)
  )
);

CREATE POLICY "Tenant admins can update order items"
ON public.order_items
FOR UPDATE
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
    AND public.is_tenant_admin(o.venue_id)
  )
);

-- Update payment_claims delete policy to be tenant-scoped
DROP POLICY IF EXISTS "Admins can delete payment claims" ON public.payment_claims;

CREATE POLICY "Tenant admins can delete payment claims"
ON public.payment_claims
FOR DELETE
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = payment_claims.order_id
    AND public.is_tenant_admin(o.venue_id)
  )
);

-- Update payment_proofs delete policy to be tenant-scoped
DROP POLICY IF EXISTS "Admins can delete payment proofs" ON public.payment_proofs;

CREATE POLICY "Tenant admins can delete payment proofs"
ON public.payment_proofs
FOR DELETE
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = payment_proofs.order_id
    AND public.is_tenant_admin(o.venue_id)
  )
);

-- Add comment to deprecate is_admin_or_staff (keep for backward compatibility but document)
COMMENT ON FUNCTION public.is_admin_or_staff() IS 'DEPRECATED: Use tenant-scoped functions is_tenant_admin(tenant_id) or is_staff_of_tenant(tenant_id) instead';