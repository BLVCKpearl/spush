-- Create staff invitations table
CREATE TABLE public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role tenant_role NOT NULL DEFAULT 'staff',
  token_hash TEXT NOT NULL,
  invited_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT staff_invitations_email_check CHECK (char_length(email) <= 255),
  CONSTRAINT unique_pending_invitation UNIQUE(tenant_id, email)
);

-- Enable RLS
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Tenant admins can view their invitations
CREATE POLICY "Tenant admins can view invitations"
ON public.staff_invitations FOR SELECT
USING (is_tenant_admin(tenant_id));

-- Tenant admins can create invitations
CREATE POLICY "Tenant admins can insert invitations"
ON public.staff_invitations FOR INSERT
WITH CHECK (is_tenant_admin(tenant_id));

-- Tenant admins can update invitations (for resending)
CREATE POLICY "Tenant admins can update invitations"
ON public.staff_invitations FOR UPDATE
USING (is_tenant_admin(tenant_id));

-- Tenant admins can delete invitations
CREATE POLICY "Tenant admins can delete invitations"
ON public.staff_invitations FOR DELETE
USING (is_tenant_admin(tenant_id));

-- Super admins have full access
CREATE POLICY "Super admins can manage all invitations"
ON public.staff_invitations FOR ALL
USING (is_super_admin());

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token TEXT;
BEGIN
  token := encode(gen_random_bytes(32), 'hex');
  RETURN token;
END;
$$;

-- Function to validate invitation token (called from edge function with service role)
CREATE OR REPLACE FUNCTION public.validate_invitation_token(p_token_hash TEXT)
RETURNS TABLE(
  invitation_id UUID,
  tenant_id UUID,
  email TEXT,
  role tenant_role,
  venue_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    si.id,
    si.tenant_id,
    si.email,
    si.role,
    v.name as venue_name
  FROM public.staff_invitations si
  JOIN public.venues v ON v.id = si.tenant_id
  WHERE si.token_hash = p_token_hash
    AND si.accepted_at IS NULL
    AND si.expires_at > now()
  LIMIT 1;
$$;

-- Function to mark invitation as accepted
CREATE OR REPLACE FUNCTION public.accept_invitation(p_invitation_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.staff_invitations
  SET accepted_at = now()
  WHERE id = p_invitation_id;
$$;