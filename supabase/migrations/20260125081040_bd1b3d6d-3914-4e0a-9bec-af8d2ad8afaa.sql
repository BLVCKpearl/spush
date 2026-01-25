-- Add venue_id and table_id to orders
ALTER TABLE public.orders
ADD COLUMN venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
ADD COLUMN table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL;

-- Add item_snapshot JSON to order_items for preserving item data
ALTER TABLE public.order_items
ADD COLUMN item_snapshot JSONB NOT NULL DEFAULT '{}';

-- Create index for venue/table lookups
CREATE INDEX idx_orders_venue_id ON public.orders(venue_id);
CREATE INDEX idx_orders_table_id ON public.orders(table_id);