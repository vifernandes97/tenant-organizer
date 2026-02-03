-- Criar função SECURITY DEFINER para aceitar convite
-- Isso permite operações atômicas que bypassam RLS de forma segura

CREATE OR REPLACE FUNCTION public.accept_invitation(
  _token uuid,
  _user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invitation record;
BEGIN
  -- 1. Buscar e validar convite
  SELECT * INTO _invitation
  FROM invitations
  WHERE token = _token
    AND status = 'pending'
    AND expires_at > now();
  
  IF _invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite inválido ou expirado');
  END IF;
  
  -- 2. Verificar se email do usuário corresponde ao convite
  IF (SELECT email FROM auth.users WHERE id = _user_id) != _invitation.email THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email não corresponde ao convite');
  END IF;
  
  -- 3. Atualizar profile com tenant_id
  UPDATE profiles 
  SET tenant_id = _invitation.tenant_id
  WHERE id = _user_id;
  
  -- Se profile não existe, criar
  IF NOT FOUND THEN
    INSERT INTO profiles (id, tenant_id)
    VALUES (_user_id, _invitation.tenant_id);
  END IF;
  
  -- 4. Upsert user_role
  INSERT INTO user_roles (user_id, tenant_id, role)
  VALUES (_user_id, _invitation.tenant_id, _invitation.role)
  ON CONFLICT (user_id, tenant_id) 
  DO UPDATE SET role = EXCLUDED.role;
  
  -- 5. Criar acessos aos clientes (se houver)
  IF _invitation.client_ids IS NOT NULL AND array_length(_invitation.client_ids, 1) > 0 THEN
    INSERT INTO user_client_access (user_id, client_id, tenant_id)
    SELECT _user_id, unnest(_invitation.client_ids), _invitation.tenant_id
    ON CONFLICT (user_id, client_id) DO NOTHING;
  END IF;
  
  -- 6. Marcar convite como aceito
  UPDATE invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = _invitation.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', _invitation.tenant_id,
    'role', _invitation.role
  );
END;
$$;