-- Create a function to check if user is staff
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(), 'staff')
$$;

-- Create a function to check if user is admin or staff (for shared access)
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
$$;

-- Update orders policy: Staff can also update orders (for status changes and payment confirmation)
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins and staff can update orders"
ON public.orders
FOR UPDATE
USING (is_admin_or_staff());