
-- 1) Fix accept_invitation: ignore caller-supplied user id, use auth.uid()
CREATE OR REPLACE FUNCTION public.accept_invitation(_token uuid, _user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invitation record;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO _invitation
  FROM invitations
  WHERE token = _token AND status = 'pending' AND expires_at > now();

  IF _invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite inválido ou expirado');
  END IF;

  IF (SELECT email FROM auth.users WHERE id = _uid) <> _invitation.email THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email não corresponde ao convite');
  END IF;

  UPDATE profiles SET tenant_id = _invitation.tenant_id WHERE id = _uid;
  IF NOT FOUND THEN
    INSERT INTO profiles (id, tenant_id) VALUES (_uid, _invitation.tenant_id);
  END IF;

  INSERT INTO user_roles (user_id, tenant_id, role, custom_role_id)
  VALUES (_uid, _invitation.tenant_id, _invitation.role, _invitation.custom_role_id)
  ON CONFLICT (user_id, tenant_id)
  DO UPDATE SET role = EXCLUDED.role, custom_role_id = EXCLUDED.custom_role_id;

  IF _invitation.client_ids IS NOT NULL AND array_length(_invitation.client_ids, 1) > 0 THEN
    INSERT INTO user_client_access (user_id, client_id, tenant_id)
    SELECT _uid, unnest(_invitation.client_ids), _invitation.tenant_id
    ON CONFLICT (user_id, client_id) DO NOTHING;
  END IF;

  UPDATE invitations SET status = 'accepted', accepted_at = now() WHERE id = _invitation.id;

  RETURN jsonb_build_object('success', true, 'tenant_id', _invitation.tenant_id, 'role', _invitation.role);
END;
$$;

-- 2) Restrict tenant_subscriptions SELECT to owners only
DROP POLICY IF EXISTS tenant_subscriptions_select_members ON public.tenant_subscriptions;

CREATE POLICY tenant_subscriptions_select_owners
  ON public.tenant_subscriptions FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'owner'::public.app_role)
  );

-- 3) Harden user_roles UPDATE: prevent self-edit and prevent promotion to owner
DROP POLICY IF EXISTS "Owners can update user roles" ON public.user_roles;

CREATE POLICY "Owners can update user roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'owner'::public.app_role)
    AND user_id <> auth.uid()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'owner'::public.app_role)
    AND user_id <> auth.uid()
    AND role <> 'owner'::public.app_role
  );
