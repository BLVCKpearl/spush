-- Add table_label column to orders for snapshot consistency
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS table_label TEXT;

-- Backfill existing orders with table labels from tables
UPDATE public.orders o
SET table_label = t.label
FROM public.tables t
WHERE o.table_id = t.id
  AND o.table_label IS NULL;

-- Create partial unique index to enforce one unpaid order per table
-- This covers pending_payment and cash_on_delivery statuses
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_one_unpaid_per_table
ON public.orders (table_id)
WHERE status IN ('pending_payment', 'cash_on_delivery')
  AND table_id IS NOT NULL;

-- Create an index for faster lookups of active orders by table
CREATE INDEX IF NOT EXISTS idx_orders_active_by_table
ON public.orders (table_id, status)
WHERE status IN ('pending_payment', 'cash_on_delivery');