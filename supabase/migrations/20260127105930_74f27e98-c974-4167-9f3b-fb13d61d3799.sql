-- Enable realtime for payment_claims table so dashboard updates instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_claims;