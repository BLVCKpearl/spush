-- Create tenant_feature_flags table for runtime feature gating
CREATE TABLE public.tenant_feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, feature_key)
);

-- Enable RLS
ALTER TABLE public.tenant_feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Super admins can manage all feature flags"
  ON public.tenant_feature_flags FOR ALL
  USING (is_super_admin());

CREATE POLICY "Tenant admins can view their feature flags"
  ON public.tenant_feature_flags FOR SELECT
  USING (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant admins can update their feature flags"
  ON public.tenant_feature_flags FOR UPDATE
  USING (is_tenant_admin(tenant_id));

-- Trigger for updated_at
CREATE TRIGGER update_tenant_feature_flags_updated_at
  BEFORE UPDATE ON public.tenant_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Add index for fast lookups
CREATE INDEX idx_tenant_feature_flags_tenant_key 
  ON public.tenant_feature_flags(tenant_id, feature_key);

-- Insert default feature flags for existing tenants
INSERT INTO public.tenant_feature_flags (tenant_id, feature_key, is_enabled)
SELECT id, 'cash_payments', true FROM public.venues
UNION ALL
SELECT id, 'bank_transfers', true FROM public.venues
UNION ALL
SELECT id, 'customer_name_required', false FROM public.venues
UNION ALL
SELECT id, 'show_estimated_time', false FROM public.venues;