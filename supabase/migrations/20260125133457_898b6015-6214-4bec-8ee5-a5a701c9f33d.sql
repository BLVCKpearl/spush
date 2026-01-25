-- =====================================================
-- ADMIN USER MANAGEMENT: Extend profiles + audit logs
-- =====================================================

-- Add is_active column to profiles for user deactivation
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add index for active users lookup
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- =====================================================
-- Create admin_audit_logs table for auditability
-- =====================================================

CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT action_not_empty CHECK (char_length(action) > 0 AND char_length(action) <= 100)
);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  USING (is_admin());

-- Only admins can create audit logs (via edge function using service role)
CREATE POLICY "System can insert audit logs"
  ON public.admin_audit_logs
  FOR INSERT
  WITH CHECK (true);

-- No updates or deletes allowed (immutable audit trail)
-- (No UPDATE/DELETE policies = no access)

-- Index for common queries
CREATE INDEX idx_audit_logs_actor ON public.admin_audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_target ON public.admin_audit_logs(target_user_id);
CREATE INDEX idx_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX idx_audit_logs_created ON public.admin_audit_logs(created_at DESC);

-- =====================================================
-- Rate limiting table for password resets
-- =====================================================

CREATE TABLE public.password_reset_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS (service role bypasses)
ALTER TABLE public.password_reset_rate_limits ENABLE ROW LEVEL SECURITY;

-- No public access
CREATE POLICY "No public access to rate limits"
  ON public.password_reset_rate_limits
  FOR ALL
  USING (false);

-- Function to check password reset rate limit (max 3 per hour)
CREATE OR REPLACE FUNCTION public.check_password_reset_rate_limit(p_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.password_reset_rate_limits
  WHERE target_user_id = p_target_user_id
    AND created_at > now() - INTERVAL '1 hour';
  
  RETURN recent_count < 3;
END;
$$;

-- Function to record password reset attempt
CREATE OR REPLACE FUNCTION public.record_password_reset_attempt(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.password_reset_rate_limits (target_user_id) VALUES (p_target_user_id);
  
  -- Clean up old entries
  DELETE FROM public.password_reset_rate_limits 
  WHERE created_at < now() - INTERVAL '2 hours';
END;
$$;

-- =====================================================
-- Function to count active admins (for last-admin protection)
-- =====================================================

CREATE OR REPLACE FUNCTION public.count_active_admins()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.user_roles ur
  JOIN public.profiles p ON ur.user_id = p.user_id
  WHERE ur.role = 'admin' AND p.is_active = true
$$;