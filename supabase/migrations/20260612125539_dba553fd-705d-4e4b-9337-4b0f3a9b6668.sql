
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
  _agencia_plan_id uuid;
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

  -- Criar subscription em trial ANTES do user_roles, senão o trigger
  -- enforce_plan_on_user_roles considera o tenant "locked" (sem subscription).
  SELECT id INTO _agencia_plan_id FROM public.plans WHERE code = 'agencia';
  INSERT INTO public.tenant_subscriptions (tenant_id, plan_id, status, trial_ends_at)
  VALUES (_tenant_id, _agencia_plan_id, 'trialing', now() + interval '14 days');

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (_user_id, _tenant_id, 'owner');

  PERFORM public.seed_default_roles_for_tenant(_tenant_id);

  RETURN jsonb_build_object('tenant_id', _tenant_id);
END;
$function$;
