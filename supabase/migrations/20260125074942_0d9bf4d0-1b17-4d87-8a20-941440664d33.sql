-- Create venues table
CREATE TABLE public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tables table
CREATE TABLE public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  qr_token TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_tables_venue_id ON public.tables(venue_id);
CREATE INDEX idx_tables_qr_token ON public.tables(qr_token);
CREATE INDEX idx_venues_slug ON public.venues(venue_slug);

-- Enable RLS
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- RLS policies for venues (publicly readable, admin writable)
CREATE POLICY "Venues are publicly readable"
ON public.venues FOR SELECT
USING (true);

CREATE POLICY "Admins can insert venues"
ON public.venues FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update venues"
ON public.venues FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete venues"
ON public.venues FOR DELETE
USING (is_admin());

-- RLS policies for tables (publicly readable, admin writable)
CREATE POLICY "Tables are publicly readable"
ON public.tables FOR SELECT
USING (true);

CREATE POLICY "Admins can insert tables"
ON public.tables FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update tables"
ON public.tables FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete tables"
ON public.tables FOR DELETE
USING (is_admin());