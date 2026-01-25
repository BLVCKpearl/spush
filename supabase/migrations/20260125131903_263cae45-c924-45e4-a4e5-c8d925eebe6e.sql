-- ==========================================
-- SECURITY FIX 1: Bank Details Exposure
-- Restrict bank_details SELECT to admin/staff only (guests see via checkout flow)
-- ==========================================

-- Drop the existing public read policy
DROP POLICY IF EXISTS "Bank details are publicly readable when active" ON public.bank_details;

-- Create new policy: Only admin/staff can read bank details
CREATE POLICY "Admin and staff can read bank details"
ON public.bank_details
FOR SELECT
USING (is_admin_or_staff());

-- ==========================================
-- SECURITY FIX 2: QR Tokens Exposure
-- Create a public view without sensitive tokens
-- Restrict raw table access to admin only
-- ==========================================

-- Drop the existing public read policy on tables
DROP POLICY IF EXISTS "Tables are publicly readable" ON public.tables;

-- Create policy: Only admin can read raw table data (includes qr_token)
CREATE POLICY "Admins can read tables"
ON public.tables
FOR SELECT
USING (is_admin());

-- Create a secure view for public table resolution (without exposing all tokens)
-- This allows the QR resolver to work by matching on qr_token
CREATE OR REPLACE VIEW public.tables_public AS
SELECT 
  id,
  venue_id,
  label,
  active
FROM public.tables;

-- Grant access to the view for anonymous and authenticated users
GRANT SELECT ON public.tables_public TO anon, authenticated;

-- Create a secure function for QR token resolution
-- This allows guests to resolve a QR token without seeing other tokens
CREATE OR REPLACE FUNCTION public.resolve_qr_token(p_qr_token TEXT)
RETURNS TABLE (
  id UUID,
  venue_id UUID,
  label TEXT,
  active BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.venue_id, t.label, t.active
  FROM public.tables t
  WHERE t.qr_token = p_qr_token
  LIMIT 1;
$$;

-- ==========================================
-- SECURITY FIX 3: Input Validation
-- Add CHECK constraints for text field lengths
-- Add trigger to validate order item prices
-- ==========================================

-- Add length constraints to orders table
ALTER TABLE public.orders 
ADD CONSTRAINT orders_customer_name_length 
CHECK (customer_name IS NULL OR LENGTH(customer_name) <= 100);

-- Add length constraints to payment_claims table
ALTER TABLE public.payment_claims 
ADD CONSTRAINT payment_claims_sender_name_length 
CHECK (sender_name IS NULL OR LENGTH(sender_name) <= 100);

ALTER TABLE public.payment_claims 
ADD CONSTRAINT payment_claims_bank_name_length 
CHECK (bank_name IS NULL OR LENGTH(bank_name) <= 100);

ALTER TABLE public.payment_claims 
ADD CONSTRAINT payment_claims_notes_length 
CHECK (notes IS NULL OR LENGTH(notes) <= 1000);

-- Add length constraints to payment_confirmations table
ALTER TABLE public.payment_confirmations 
ADD CONSTRAINT payment_confirmations_notes_length 
CHECK (notes IS NULL OR LENGTH(notes) <= 1000);

-- Create function to validate and correct order item prices
CREATE OR REPLACE FUNCTION public.validate_order_item_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actual_price INTEGER;
  item_available BOOLEAN;
BEGIN
  -- Get the current price and availability from menu_items
  SELECT price_kobo, is_available INTO actual_price, item_available
  FROM public.menu_items
  WHERE id = NEW.menu_item_id;
  
  -- Reject if menu item doesn't exist
  IF actual_price IS NULL THEN
    RAISE EXCEPTION 'Invalid menu item: %', NEW.menu_item_id;
  END IF;
  
  -- Reject if menu item is not available
  IF NOT item_available THEN
    RAISE EXCEPTION 'Menu item is not available: %', NEW.menu_item_id;
  END IF;
  
  -- Force the price to match the actual menu price (prevents price manipulation)
  NEW.unit_price_kobo := actual_price;
  
  RETURN NEW;
END;
$$;

-- Create trigger to validate prices on insert
CREATE TRIGGER validate_order_item_price_trigger
  BEFORE INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_item_price();