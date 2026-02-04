-- Função RPC para validar token de convite de forma segura
-- Permite que usuários anônimos validem convites sem expor dados sensíveis
CREATE OR REPLACE FUNCTION public.validate_invitation_token(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record record;
BEGIN
  SELECT i.email, t.name as tenant_name
  INTO invitation_record
  FROM invitations i
  INNER JOIN tenants t ON t.id = i.tenant_id
  WHERE i.token = _token
    AND i.status = 'pending'
    AND i.expires_at > now();
  
  IF invitation_record IS NULL THEN
    RETURN jsonb_build_object('valid', false);
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'email', invitation_record.email,
    'tenant_name', invitation_record.tenant_name
  );
END;
$$;