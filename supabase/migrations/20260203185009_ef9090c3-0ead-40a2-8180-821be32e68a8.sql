-- Função para buscar nome do tenant a partir de um token de convite válido
-- Usa SECURITY DEFINER para bypassa RLS e permitir acesso anônimo
CREATE OR REPLACE FUNCTION public.get_tenant_name_for_invitation(invitation_token uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_name text;
BEGIN
  SELECT t.name INTO tenant_name
  FROM tenants t
  INNER JOIN invitations i ON i.tenant_id = t.id
  WHERE i.token = invitation_token
    AND i.status = 'pending'
    AND i.expires_at > now();
  
  RETURN tenant_name;
END;
$$;