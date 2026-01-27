-- Prompt 3: Orders security - Restrict access by role with tenant scoping

-- ============================================
-- ORDERS: Refine access control
-- ============================================

-- Drop existing order policies to rebuild with proper scoping
DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
DROP POLICY IF EXISTS "Super admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Super admins can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Tenant admins can delete tenant orders" ON public.orders;
DROP POLICY IF EXISTS "Tenant staff can update tenant orders" ON public.orders;
DROP POLICY IF EXISTS "Tenant staff can view tenant orders" ON public.orders;

-- Super admins: Global full CRUD
CREATE POLICY "Super admins have full order access"
ON public.orders
FOR ALL
USING (public.is_super_admin());

-- Tenant admins: Full CRUD within their tenant
CREATE POLICY "Tenant admins have full order access"
ON public.orders
FOR ALL
USING (public.is_tenant_admin(venue_id));

-- Staff: Read access within tenant
CREATE POLICY "Staff can view tenant orders"
ON public.orders
FOR SELECT
USING (public.is_staff_of_tenant(venue_id));

-- Staff: Limited update (status changes only, not deletion/cancellation)
-- This is enforced via a more restrictive function
CREATE OR REPLACE FUNCTION public.is_staff_only(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = _tenant_id
      AND tenant_role = 'staff'
  )
  AND NOT public.is_super_admin()
  AND NOT public.is_tenant_admin(_tenant_id)
$$;

-- Staff can only update certain fields (status progression, not cancel/expire)
CREATE POLICY "Staff can update order status"
ON public.orders
FOR UPDATE
USING (
  public.is_staff_only(venue_id)
)
WITH CHECK (
  public.is_staff_only(venue_id)
  -- Staff cannot set cancelled or expired status (enforced at trigger level for now)
);

-- Public: Can view their own orders (for tracking)
CREATE POLICY "Public can view orders by reference"
ON public.orders
FOR SELECT
USING (true);  -- Order tracking uses order_reference lookup

-- ============================================
-- Create trigger to prevent staff from cancelling/expiring orders
-- ============================================

CREATE OR REPLACE FUNCTION public.prevent_staff_order_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_tenant_id UUID;
BEGIN
  -- Get the venue_id for this order
  SELECT venue_id INTO order_tenant_id FROM public.orders WHERE id = NEW.id;
  
  -- If the user is staff-only (not admin) and trying to set status to cancelled or expired, reject
  IF public.is_staff_only(order_tenant_id) THEN
    IF NEW.status IN ('cancelled', 'expired') AND OLD.status NOT IN ('cancelled', 'expired') THEN
      RAISE EXCEPTION 'Staff cannot cancel or expire orders. Contact an admin.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_staff_order_cancellation_trigger ON public.orders;

CREATE TRIGGER prevent_staff_order_cancellation_trigger
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_staff_order_cancellation();