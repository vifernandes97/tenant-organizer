-- 1. Fix has_client_access to validate tenant
CREATE OR REPLACE FUNCTION public.has_client_access(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = _client_id
      AND c.tenant_id = public.get_user_tenant_id(_user_id)
      AND (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.tenant_id = c.tenant_id
            AND ur.role = 'owner'
        )
        OR EXISTS (
          SELECT 1 FROM public.user_client_access uca
          WHERE uca.user_id = _user_id
            AND uca.client_id = _client_id
            AND uca.tenant_id = c.tenant_id
        )
      )
  )
$$;

-- 2. Remove redundant public SELECT policy on post-images storage bucket
DROP POLICY IF EXISTS "Anyone can view post images" ON storage.objects;

-- 3. Remove the SELECT policy that exposes invitation tokens to any matching user.
-- The validate_invitation_token RPC (SECURITY DEFINER) already exposes only
-- non-sensitive fields for the AcceptInvite flow.
DROP POLICY IF EXISTS "Anyone can validate invitation token by email" ON public.invitations;

-- 4. Remove client-side owner self-assignment and move tenant creation
-- (tenant + profile + owner role) into a SECURITY DEFINER RPC.
DROP POLICY IF EXISTS "Signup: insert own initial owner role" ON public.user_roles;

CREATE OR REPLACE FUNCTION public.create_tenant_with_owner(
  _tenant_name text,
  _full_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _tenant_id uuid;
  _slug text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF _tenant_name IS NULL OR length(trim(_tenant_name)) = 0 THEN
    RAISE EXCEPTION 'Nome da empresa obrigatório';
  END IF;

  -- Block if user already has any role (prevents privilege re-assignment)
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'Usuário já possui acesso a uma empresa';
  END IF;

  _slug := regexp_replace(
    regexp_replace(lower(unaccent_safe(_tenant_name)), '[^a-z0-9]+', '-', 'g'),
    '(^-|-$)', '', 'g'
  ) || '-' || to_char(extract(epoch from now())::bigint, 'FM999999999999');

  _tenant_id := gen_random_uuid();

  INSERT INTO public.tenants (id, name, slug)
  VALUES (_tenant_id, trim(_tenant_name), _slug);

  INSERT INTO public.profiles (id, tenant_id, full_name)
  VALUES (_user_id, _tenant_id, _full_name)
  ON CONFLICT (id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (_user_id, _tenant_id, 'owner');

  RETURN jsonb_build_object('tenant_id', _tenant_id);
END;
$$;

-- Minimal helper for slug generation (no unaccent extension required)
CREATE OR REPLACE FUNCTION public.unaccent_safe(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT translate(
    _input,
    'áàâãäåÁÀÂÃÄÅéèêëÉÈÊËíìîïÍÌÎÏóòôõöÓÒÔÕÖúùûüÚÙÛÜçÇñÑ',
    'aaaaaaAAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUcCnN'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.create_tenant_with_owner(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_tenant_with_owner(text, text) TO authenticated;
