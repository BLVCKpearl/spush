-- Add new order statuses for payment methods
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'cash_on_delivery';