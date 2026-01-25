-- Add 'expired' to the order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'expired';

-- Add expires_at column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Create venue_settings table for configurable settings like order expiry time
CREATE TABLE IF NOT EXISTS public.venue_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(venue_id, setting_key)
);

-- Enable RLS on venue_settings
ALTER TABLE public.venue_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for venue_settings
CREATE POLICY "Venue settings are publicly readable"
ON public.venue_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert venue settings"
ON public.venue_settings
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update venue settings"
ON public.venue_settings
FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete venue settings"
ON public.venue_settings
FOR DELETE
USING (is_admin());

-- Create trigger for updating updated_at on venue_settings
CREATE TRIGGER update_venue_settings_updated_at
BEFORE UPDATE ON public.venue_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create function to get order expiry minutes for a venue (default 15 minutes)
CREATE OR REPLACE FUNCTION public.get_order_expiry_minutes(p_venue_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT setting_value::INTEGER 
     FROM public.venue_settings 
     WHERE venue_id = p_venue_id AND setting_key = 'order_expiry_minutes'),
    15  -- Default 15 minutes
  )
$$;

-- Create function to set expires_at on new bank transfer orders
CREATE OR REPLACE FUNCTION public.set_order_expires_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expiry_minutes INTEGER;
BEGIN
  -- Only set expires_at for bank_transfer orders that start as pending_payment
  IF NEW.payment_method = 'bank_transfer' AND NEW.status = 'pending_payment' THEN
    expiry_minutes := public.get_order_expiry_minutes(NEW.venue_id);
    NEW.expires_at := NEW.created_at + (expiry_minutes || ' minutes')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to set expires_at on new orders
CREATE TRIGGER set_order_expires_at_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_expires_at();

-- Create function to expire pending orders (called by cron job)
CREATE OR REPLACE FUNCTION public.expire_pending_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.orders
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending_payment'
    AND expires_at IS NOT NULL
    AND expires_at < now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- Insert default expiry setting for the demo venue
INSERT INTO public.venue_settings (venue_id, setting_key, setting_value)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'order_expiry_minutes', '15')
ON CONFLICT (venue_id, setting_key) DO NOTHING;