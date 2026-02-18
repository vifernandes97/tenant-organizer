
-- 1. Allow users to view profiles of members in the same tenant
CREATE POLICY "Users can view profiles in same tenant"
ON public.profiles FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 2. Create secure RPC for member removal
CREATE OR REPLACE FUNCTION public.remove_team_member(_member_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
BEGIN
  SELECT tenant_id INTO _tenant_id FROM profiles WHERE id = auth.uid();
  
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND tenant_id = _tenant_id AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Sem permissao';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = _member_id AND tenant_id = _tenant_id
  ) THEN
    RAISE EXCEPTION 'Membro nao encontrado';
  END IF;

  IF _member_id = auth.uid() THEN
    RAISE EXCEPTION 'Nao e possivel remover a si mesmo';
  END IF;

  DELETE FROM user_client_access WHERE user_id = _member_id AND tenant_id = _tenant_id;
  DELETE FROM user_roles WHERE user_id = _member_id AND tenant_id = _tenant_id;
  UPDATE profiles SET tenant_id = NULL WHERE id = _member_id;

  RETURN true;
END;
$$;
