-- 1. Create order_events table for audit logging
CREATE TABLE public.order_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  old_status order_status NULL,
  new_status order_status NULL,
  actor_id UUID NULL, -- NULL for system/guest actions
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

-- Policies for order_events
CREATE POLICY "Order events are publicly readable"
ON public.order_events FOR SELECT
USING (true);

CREATE POLICY "Admins and staff can create order events"
ON public.order_events FOR INSERT
WITH CHECK (is_admin_or_staff() OR actor_id IS NULL);

-- Index for efficient queries
CREATE INDEX idx_order_events_order_id ON public.order_events(order_id);
CREATE INDEX idx_order_events_created_at ON public.order_events(created_at DESC);

-- 2. Add idempotency_key to orders table
ALTER TABLE public.orders ADD COLUMN idempotency_key TEXT NULL;
CREATE UNIQUE INDEX idx_orders_idempotency_key ON public.orders(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 3. Add rate limiting tracking table
CREATE TABLE public.order_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (allow inserts for rate tracking)
ALTER TABLE public.order_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert rate limit entries"
ON public.order_rate_limits FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can read rate limit entries"
ON public.order_rate_limits FOR SELECT
USING (true);

-- Index for efficient rate limit queries
CREATE INDEX idx_order_rate_limits_table_created ON public.order_rate_limits(table_id, created_at DESC);

-- 4. Function to check rate limit (max 5 orders per table per 10 minutes)
CREATE OR REPLACE FUNCTION public.check_order_rate_limit(p_table_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Count orders from this table in last 10 minutes
  SELECT COUNT(*) INTO recent_count
  FROM public.order_rate_limits
  WHERE table_id = p_table_id
    AND created_at > now() - INTERVAL '10 minutes';
  
  -- Allow if under 5 orders
  RETURN recent_count < 5;
END;
$$;

-- 5. Function to record rate limit entry
CREATE OR REPLACE FUNCTION public.record_order_rate_limit(p_table_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.order_rate_limits (table_id) VALUES (p_table_id);
  
  -- Clean up old entries (older than 1 hour)
  DELETE FROM public.order_rate_limits 
  WHERE created_at < now() - INTERVAL '1 hour';
END;
$$;

-- 6. Trigger to log status transitions
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_events (order_id, event_type, old_status, new_status, actor_id)
    VALUES (NEW.id, 'status_change', OLD.status, NEW.status, auth.uid());
  END IF;
  
  -- Log payment confirmation changes
  IF OLD.payment_confirmed IS DISTINCT FROM NEW.payment_confirmed AND NEW.payment_confirmed = true THEN
    INSERT INTO public.order_events (order_id, event_type, actor_id, metadata)
    VALUES (NEW.id, 'payment_confirmed', auth.uid(), '{"confirmed": true}'::jsonb);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_order_status_change
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.log_order_status_change();

-- 7. Trigger to log order creation
CREATE OR REPLACE FUNCTION public.log_order_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.order_events (order_id, event_type, new_status, metadata)
  VALUES (NEW.id, 'order_created', NEW.status, jsonb_build_object(
    'payment_method', NEW.payment_method,
    'total_kobo', NEW.total_kobo,
    'table_number', NEW.table_number
  ));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_order_creation
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.log_order_creation();

-- 8. Function to check if payment already confirmed
CREATE OR REPLACE FUNCTION public.has_payment_confirmation(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.payment_confirmations
    WHERE order_id = p_order_id
  )
$$;

-- Enable realtime for order_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_events;