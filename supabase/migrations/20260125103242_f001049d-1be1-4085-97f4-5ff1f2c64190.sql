-- Create payment_confirmations table
CREATE TABLE public.payment_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  confirmed_by UUID NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  method TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and staff can create payment confirmations"
ON public.payment_confirmations
FOR INSERT
WITH CHECK (is_admin_or_staff());

CREATE POLICY "Payment confirmations are publicly readable"
ON public.payment_confirmations
FOR SELECT
USING (true);

CREATE POLICY "Admins can delete payment confirmations"
ON public.payment_confirmations
FOR DELETE
USING (is_admin());

-- Add index for faster lookups
CREATE INDEX idx_payment_confirmations_order_id ON public.payment_confirmations(order_id);