
-- Enums
CREATE TYPE public.app_feature AS ENUM ('clients','posts','post_status','brainstorm');
CREATE TYPE public.app_action AS ENUM ('view','create','edit','delete');

-- Roles
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view roles in own tenant" ON public.roles
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Owners can insert roles" ON public.roles
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'owner'));
CREATE POLICY "Owners can update roles" ON public.roles
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'owner'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'owner'));
CREATE POLICY "Owners can delete non-system roles" ON public.roles
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'owner') AND is_system = false);

CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Role permissions
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  feature public.app_feature NOT NULL,
  action public.app_action NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, feature, action)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view permissions of roles in own tenant" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.tenant_id = public.get_user_tenant_id(auth.uid())));
CREATE POLICY "Owners can insert role permissions" ON public.role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'owner') AND EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.tenant_id = public.get_user_tenant_id(auth.uid())));
CREATE POLICY "Owners can delete role permissions" ON public.role_permissions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'owner') AND EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.tenant_id = public.get_user_tenant_id(auth.uid())));

-- Add custom_role_id to user_roles and invitations
ALTER TABLE public.user_roles ADD COLUMN custom_role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL;
ALTER TABLE public.invitations ADD COLUMN custom_role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL;

-- Allow owners to update user_roles (needed to change a member's role)
CREATE POLICY "Owners can update user roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'owner'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'owner'));

-- has_permission function
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _feature public.app_feature, _action public.app_action)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN public.has_role(_user_id, 'owner') THEN true
      ELSE EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON rp.role_id = ur.custom_role_id
        WHERE ur.user_id = _user_id
          AND ur.tenant_id = public.get_user_tenant_id(_user_id)
          AND rp.feature = _feature
          AND rp.action = _action
      )
    END
$$;

-- Seed function: create default roles for a tenant
CREATE OR REPLACE FUNCTION public.seed_default_roles_for_tenant(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _editor_id uuid;
  _revisor_id uuid;
  _viewer_id uuid;
BEGIN
  -- Editor
  INSERT INTO public.roles (tenant_id, name, description, is_system)
  VALUES (_tenant_id, 'Editor', 'Pode criar, editar e excluir posts e ideias; visualiza dados de clientes', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET description = EXCLUDED.description
  RETURNING id INTO _editor_id;

  INSERT INTO public.role_permissions (role_id, feature, action) VALUES
    (_editor_id,'clients','view'),
    (_editor_id,'posts','view'),(_editor_id,'posts','create'),(_editor_id,'posts','edit'),(_editor_id,'posts','delete'),
    (_editor_id,'post_status','edit'),
    (_editor_id,'brainstorm','view'),(_editor_id,'brainstorm','create'),(_editor_id,'brainstorm','edit'),(_editor_id,'brainstorm','delete')
  ON CONFLICT DO NOTHING;

  -- Revisor
  INSERT INTO public.roles (tenant_id, name, description, is_system)
  VALUES (_tenant_id, 'Revisor', 'Visualiza posts e clientes; aprova/muda status; sugere ideias', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET description = EXCLUDED.description
  RETURNING id INTO _revisor_id;

  INSERT INTO public.role_permissions (role_id, feature, action) VALUES
    (_revisor_id,'clients','view'),
    (_revisor_id,'posts','view'),
    (_revisor_id,'post_status','edit'),
    (_revisor_id,'brainstorm','view'),(_revisor_id,'brainstorm','create')
  ON CONFLICT DO NOTHING;

  -- Visualizador
  INSERT INTO public.roles (tenant_id, name, description, is_system)
  VALUES (_tenant_id, 'Visualizador', 'Apenas visualiza dados', true)
  ON CONFLICT (tenant_id, name) DO UPDATE SET description = EXCLUDED.description
  RETURNING id INTO _viewer_id;

  INSERT INTO public.role_permissions (role_id, feature, action) VALUES
    (_viewer_id,'clients','view'),
    (_viewer_id,'posts','view'),
    (_viewer_id,'brainstorm','view')
  ON CONFLICT DO NOTHING;
END;
$$;

-- Seed for existing tenants
DO $$
DECLARE _t uuid;
BEGIN
  FOR _t IN SELECT id FROM public.tenants LOOP
    PERFORM public.seed_default_roles_for_tenant(_t);
  END LOOP;
END $$;

-- Backfill: assign Editor role to existing members
UPDATE public.user_roles ur
SET custom_role_id = r.id
FROM public.roles r
WHERE ur.role = 'member'
  AND ur.custom_role_id IS NULL
  AND r.tenant_id = ur.tenant_id
  AND r.name = 'Editor';

-- Update create_tenant_with_owner to seed default roles
CREATE OR REPLACE FUNCTION public.create_tenant_with_owner(_tenant_name text, _full_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'Usuário já possui acesso a uma empresa';
  END IF;

  _slug := regexp_replace(
    regexp_replace(lower(unaccent_safe(_tenant_name)), '[^a-z0-9]+', '-', 'g'),
    '(^-|-$)', '', 'g'
  ) || '-' || to_char(extract(epoch from now())::bigint, 'FM999999999999');

  _tenant_id := gen_random_uuid();

  INSERT INTO public.tenants (id, name, slug) VALUES (_tenant_id, trim(_tenant_name), _slug);

  INSERT INTO public.profiles (id, tenant_id, full_name)
  VALUES (_user_id, _tenant_id, _full_name)
  ON CONFLICT (id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (_user_id, _tenant_id, 'owner');

  PERFORM public.seed_default_roles_for_tenant(_tenant_id);

  RETURN jsonb_build_object('tenant_id', _tenant_id);
END;
$function$;

-- Update accept_invitation to apply custom_role_id
CREATE OR REPLACE FUNCTION public.accept_invitation(_token uuid, _user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _invitation record;
BEGIN
  SELECT * INTO _invitation
  FROM invitations
  WHERE token = _token AND status = 'pending' AND expires_at > now();

  IF _invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite inválido ou expirado');
  END IF;

  IF (SELECT email FROM auth.users WHERE id = _user_id) != _invitation.email THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email não corresponde ao convite');
  END IF;

  UPDATE profiles SET tenant_id = _invitation.tenant_id WHERE id = _user_id;
  IF NOT FOUND THEN
    INSERT INTO profiles (id, tenant_id) VALUES (_user_id, _invitation.tenant_id);
  END IF;

  INSERT INTO user_roles (user_id, tenant_id, role, custom_role_id)
  VALUES (_user_id, _invitation.tenant_id, _invitation.role, _invitation.custom_role_id)
  ON CONFLICT (user_id, tenant_id)
  DO UPDATE SET role = EXCLUDED.role, custom_role_id = EXCLUDED.custom_role_id;

  IF _invitation.client_ids IS NOT NULL AND array_length(_invitation.client_ids, 1) > 0 THEN
    INSERT INTO user_client_access (user_id, client_id, tenant_id)
    SELECT _user_id, unnest(_invitation.client_ids), _invitation.tenant_id
    ON CONFLICT (user_id, client_id) DO NOTHING;
  END IF;

  UPDATE invitations SET status = 'accepted', accepted_at = now() WHERE id = _invitation.id;

  RETURN jsonb_build_object('success', true, 'tenant_id', _invitation.tenant_id, 'role', _invitation.role);
END;
$function$;

-- Refresh RLS policies for clients, posts, brainstorm_ideas
-- CLIENTS
DROP POLICY IF EXISTS "Users can view clients with access" ON public.clients;
DROP POLICY IF EXISTS "Users with access can update clients" ON public.clients;
CREATE POLICY "Users can view clients with access" ON public.clients
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'owner')
         OR (public.has_client_access(auth.uid(), id) AND public.has_permission(auth.uid(),'clients','view')))
  );
CREATE POLICY "Users with access can update clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'owner')
         OR (public.has_client_access(auth.uid(), id) AND public.has_permission(auth.uid(),'clients','edit')))
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'owner')
         OR (public.has_client_access(auth.uid(), id) AND public.has_permission(auth.uid(),'clients','edit')))
  );

-- POSTS
DROP POLICY IF EXISTS "Users can view posts with client access" ON public.posts;
DROP POLICY IF EXISTS "Users can create posts with client access" ON public.posts;
DROP POLICY IF EXISTS "Users can update posts with client access" ON public.posts;
DROP POLICY IF EXISTS "Users can delete posts with client access" ON public.posts;

CREATE POLICY "Users can view posts with client access" ON public.posts
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'owner')
         OR (public.has_client_access(auth.uid(), client_id) AND public.has_permission(auth.uid(),'posts','view')))
  );
CREATE POLICY "Users can create posts with client access" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'owner')
         OR (public.has_client_access(auth.uid(), client_id) AND public.has_permission(auth.uid(),'posts','create')))
  );
CREATE POLICY "Users can update posts with client access" ON public.posts
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'owner')
         OR (public.has_client_access(auth.uid(), client_id)
             AND (public.has_permission(auth.uid(),'posts','edit') OR public.has_permission(auth.uid(),'post_status','edit'))))
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'owner')
         OR (public.has_client_access(auth.uid(), client_id)
             AND (public.has_permission(auth.uid(),'posts','edit') OR public.has_permission(auth.uid(),'post_status','edit'))))
  );
CREATE POLICY "Users can delete posts with client access" ON public.posts
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'owner')
         OR (public.has_client_access(auth.uid(), client_id) AND public.has_permission(auth.uid(),'posts','delete')))
  );

-- BRAINSTORM IDEAS
DROP POLICY IF EXISTS "Users can view ideas in own tenant" ON public.brainstorm_ideas;
DROP POLICY IF EXISTS "Users can create ideas in own tenant" ON public.brainstorm_ideas;
DROP POLICY IF EXISTS "Users can update ideas in own tenant" ON public.brainstorm_ideas;
DROP POLICY IF EXISTS "Users can delete ideas in own tenant" ON public.brainstorm_ideas;

CREATE POLICY "Users can view ideas in own tenant" ON public.brainstorm_ideas
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'owner') OR public.has_permission(auth.uid(),'brainstorm','view'))
  );
CREATE POLICY "Users can create ideas in own tenant" ON public.brainstorm_ideas
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND created_by = auth.uid()
    AND (public.has_role(auth.uid(),'owner') OR public.has_permission(auth.uid(),'brainstorm','create'))
  );
CREATE POLICY "Users can update ideas in own tenant" ON public.brainstorm_ideas
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'owner') OR created_by = auth.uid() OR public.has_permission(auth.uid(),'brainstorm','edit'))
  );
CREATE POLICY "Users can delete ideas in own tenant" ON public.brainstorm_ideas
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'owner') OR created_by = auth.uid() OR public.has_permission(auth.uid(),'brainstorm','delete'))
  );
