-- Add venue_id to menu_items (nullable initially for existing data)
ALTER TABLE public.menu_items
ADD COLUMN venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE;

-- Add sort_order column
ALTER TABLE public.menu_items
ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Create index for venue filtering
CREATE INDEX idx_menu_items_venue_id ON public.menu_items(venue_id);