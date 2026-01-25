-- Create payment_claims table for tracking bank transfer claims
CREATE TABLE public.payment_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  proof_url TEXT,
  sender_name TEXT,
  bank_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_claims ENABLE ROW LEVEL SECURITY;

-- Anyone can submit payment claims (guests ordering)
CREATE POLICY "Anyone can create payment claims"
  ON public.payment_claims FOR INSERT
  WITH CHECK (true);

-- Payment claims are publicly readable (by order reference lookup)
CREATE POLICY "Payment claims are publicly readable"
  ON public.payment_claims FOR SELECT
  USING (true);

-- Admins can delete payment claims
CREATE POLICY "Admins can delete payment claims"
  ON public.payment_claims FOR DELETE
  USING (is_admin());

-- Create index for order lookups
CREATE INDEX idx_payment_claims_order_id ON public.payment_claims(order_id);