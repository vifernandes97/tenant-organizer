-- Enum para status do convite
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- Tabela de convites
CREATE TABLE public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role public.app_role NOT NULL DEFAULT 'member',
    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    invited_by UUID NOT NULL,
    status public.invitation_status NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Indexes para performance
CREATE INDEX idx_invitations_tenant_id ON public.invitations(tenant_id);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_status ON public.invitations(status);

-- RLS Policies

-- Owners podem ver convites do seu tenant
CREATE POLICY "Owners can view invitations"
ON public.invitations FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner')
);

-- Owners podem criar convites
CREATE POLICY "Owners can create invitations"
ON public.invitations FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner')
);

-- Owners podem atualizar convites (revogar)
CREATE POLICY "Owners can update invitations"
ON public.invitations FOR UPDATE
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner')
);

-- Qualquer autenticado pode verificar token pelo email (para aceitar convite)
CREATE POLICY "Anyone can validate invitation token by email"
ON public.invitations FOR SELECT
TO authenticated
USING (email = auth.email() AND status = 'pending');

-- Permitir que usuario atualize convite para aceitar (marcar como accepted)
CREATE POLICY "User can accept own invitation"
ON public.invitations FOR UPDATE
TO authenticated
USING (email = auth.email() AND status = 'pending')
WITH CHECK (email = auth.email());