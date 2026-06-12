
-- =====================================================================
-- ETAPA 1: SCHEMA, FUNÇÕES, TRIGGERS, SEED
-- =====================================================================

-- 1) ENUM de status de assinatura
DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM
    ('trialing','active','past_due','canceled','locked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) TABELA plans
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  price_cents int NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  billing_period text NOT NULL DEFAULT 'monthly',
  max_active_clients int NULL,
  max_members int NULL,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select_authenticated"
  ON public.plans FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER plans_set_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) TABELA tenant_subscriptions
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_override boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tenant_subscriptions TO authenticated;
GRANT ALL ON public.tenant_subscriptions TO service_role;

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_subscriptions_select_members"
  ON public.tenant_subscriptions FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- sem INSERT/UPDATE/DELETE para authenticated: só service_role escreve

CREATE TRIGGER tenant_subscriptions_set_updated_at
  BEFORE UPDATE ON public.tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) SEED dos planos
INSERT INTO public.plans (code, name, price_cents, max_active_clients, max_members, features, display_order)
VALUES
  ('starter','Starter', 9700,  3,    2,    '{"api_access":false,"white_label":false}'::jsonb, 1),
  ('agencia','Agência',19700, 10,    NULL, '{"api_access":true,"white_label":false}'::jsonb,  2),
  ('pro',    'Pro',    39700, NULL,  NULL, '{"api_access":true,"white_label":true}'::jsonb,   3)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      price_cents = EXCLUDED.price_cents,
      max_active_clients = EXCLUDED.max_active_clients,
      max_members = EXCLUDED.max_members,
      features = EXCLUDED.features,
      display_order = EXCLUDED.display_order,
      updated_at = now();

-- 5) FUNÇÕES SECURITY DEFINER

-- 5.1 get_tenant_subscription: aplica regra de status efetivo
CREATE OR REPLACE FUNCTION public.get_tenant_subscription(_tenant_id uuid)
RETURNS TABLE (
  plan_id uuid,
  plan_code text,
  plan_name text,
  effective_status public.subscription_status,
  raw_status public.subscription_status,
  features jsonb,
  max_active_clients int,
  max_members int,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  plan_override boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _sub record;
  _eff public.subscription_status;
BEGIN
  SELECT ts.*, p.code, p.name, p.features, p.max_active_clients, p.max_members
    INTO _sub
  FROM public.tenant_subscriptions ts
  JOIN public.plans p ON p.id = ts.plan_id
  WHERE ts.tenant_id = _tenant_id
  LIMIT 1;

  IF _sub IS NULL THEN
    -- sem subscription = locked
    RETURN;
  END IF;

  IF _sub.plan_override = true THEN
    _eff := 'active';
  ELSIF _sub.status = 'trialing' AND _sub.trial_ends_at IS NOT NULL AND _sub.trial_ends_at > now() THEN
    _eff := 'trialing';
  ELSIF _sub.status = 'active' THEN
    _eff := 'active';
  ELSIF _sub.status = 'past_due'
        AND _sub.current_period_end IS NOT NULL
        AND _sub.current_period_end + interval '7 days' > now() THEN
    _eff := 'past_due';
  ELSE
    _eff := 'locked';
  END IF;

  plan_id := _sub.plan_id;
  plan_code := _sub.code;
  plan_name := _sub.name;
  effective_status := _eff;
  raw_status := _sub.status;
  features := _sub.features;
  max_active_clients := _sub.max_active_clients;
  max_members := _sub.max_members;
  trial_ends_at := _sub.trial_ends_at;
  current_period_end := _sub.current_period_end;
  plan_override := _sub.plan_override;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_subscription(uuid) TO authenticated, service_role;

-- 5.2 has_plan_feature
CREATE OR REPLACE FUNCTION public.has_plan_feature(_tenant_id uuid, _feature text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _row record;
BEGIN
  SELECT * INTO _row FROM public.get_tenant_subscription(_tenant_id);
  IF _row IS NULL THEN RETURN false; END IF;
  IF _row.effective_status = 'locked' THEN RETURN false; END IF;
  RETURN COALESCE((_row.features ->> _feature)::boolean, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_plan_feature(uuid, text) TO authenticated, service_role;

-- 5.3 within_plan_limit
CREATE OR REPLACE FUNCTION public.within_plan_limit(_tenant_id uuid, _resource text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _row record;
  _used int;
  _limit int;
BEGIN
  SELECT * INTO _row FROM public.get_tenant_subscription(_tenant_id);
  IF _row IS NULL THEN RETURN false; END IF;
  IF _row.effective_status = 'locked' THEN RETURN false; END IF;

  IF _resource = 'clients' THEN
    _limit := _row.max_active_clients;
    IF _limit IS NULL THEN RETURN true; END IF;
    SELECT count(*) INTO _used
      FROM public.clients
      WHERE tenant_id = _tenant_id AND COALESCE(status,'') <> 'archived';
    RETURN _used < _limit;

  ELSIF _resource = 'members' THEN
    _limit := _row.max_members;
    IF _limit IS NULL THEN RETURN true; END IF;
    SELECT
      (SELECT count(DISTINCT user_id) FROM public.user_roles WHERE tenant_id = _tenant_id)
      + (SELECT count(*) FROM public.invitations WHERE tenant_id = _tenant_id AND status = 'pending')
      INTO _used;
    RETURN _used < _limit;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.within_plan_limit(uuid, text) TO authenticated, service_role;

-- 5.4 helper: is_tenant_locked
CREATE OR REPLACE FUNCTION public.is_tenant_locked(_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row record;
BEGIN
  SELECT * INTO _row FROM public.get_tenant_subscription(_tenant_id);
  IF _row IS NULL THEN RETURN true; END IF;
  RETURN _row.effective_status = 'locked';
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_tenant_locked(uuid) TO authenticated, service_role;

-- 6) TRIGGERS DE ENFORCEMENT

-- 6.1 clients: limite + lock
CREATE OR REPLACE FUNCTION public.enforce_plan_on_clients()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tid uuid;
BEGIN
  _tid := NEW.tenant_id;

  -- locked bloqueia tudo
  IF public.is_tenant_locked(_tid) THEN
    RAISE EXCEPTION 'PLAN_LOCKED' USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.status,'') <> 'archived' THEN
      IF NOT public.within_plan_limit(_tid, 'clients') THEN
        RAISE EXCEPTION 'PLAN_LIMIT_CLIENTS' USING ERRCODE = 'P0001';
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- reativar arquivado
    IF COALESCE(OLD.status,'') = 'archived'
       AND COALESCE(NEW.status,'') <> 'archived' THEN
      IF NOT public.within_plan_limit(_tid, 'clients') THEN
        RAISE EXCEPTION 'PLAN_LIMIT_CLIENTS' USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_enforce_plan ON public.clients;
CREATE TRIGGER clients_enforce_plan
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_on_clients();

-- 6.2 invitations: limite de membros + lock
CREATE OR REPLACE FUNCTION public.enforce_plan_on_invitations()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_tenant_locked(NEW.tenant_id) THEN
    RAISE EXCEPTION 'PLAN_LOCKED' USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'INSERT' AND COALESCE(NEW.status,'pending') = 'pending' THEN
    IF NOT public.within_plan_limit(NEW.tenant_id, 'members') THEN
      RAISE EXCEPTION 'PLAN_LIMIT_MEMBERS' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invitations_enforce_plan ON public.invitations;
CREATE TRIGGER invitations_enforce_plan
  BEFORE INSERT OR UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_on_invitations();

-- 6.3 user_roles: defesa em profundidade (accept_invitation já valida convite)
CREATE OR REPLACE FUNCTION public.enforce_plan_on_user_roles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _existing int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- ignorar se já existe (upsert)
    SELECT count(*) INTO _existing FROM public.user_roles
      WHERE user_id = NEW.user_id AND tenant_id = NEW.tenant_id;
    IF _existing > 0 THEN RETURN NEW; END IF;

    IF NOT public.within_plan_limit(NEW.tenant_id, 'members') THEN
      RAISE EXCEPTION 'PLAN_LIMIT_MEMBERS' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_enforce_plan ON public.user_roles;
CREATE TRIGGER user_roles_enforce_plan
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_on_user_roles();

-- 6.4 tenant_api_tokens: feature api_access + lock
CREATE OR REPLACE FUNCTION public.enforce_plan_on_api_tokens()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_tenant_locked(NEW.tenant_id) THEN
    RAISE EXCEPTION 'PLAN_LOCKED' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NOT public.has_plan_feature(NEW.tenant_id, 'api_access') THEN
      RAISE EXCEPTION 'PLAN_FEATURE_API' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS api_tokens_enforce_plan ON public.tenant_api_tokens;
CREATE TRIGGER api_tokens_enforce_plan
  BEFORE INSERT OR UPDATE ON public.tenant_api_tokens
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_on_api_tokens();

-- 6.5 lock genérico para conteúdo: posts, post_images, post_comments, brainstorm_ideas
CREATE OR REPLACE FUNCTION public.enforce_plan_lock_only()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tid uuid;
BEGIN
  IF TG_TABLE_NAME = 'post_images' THEN
    SELECT p.tenant_id INTO _tid FROM public.posts p WHERE p.id = NEW.post_id;
  ELSIF TG_TABLE_NAME = 'post_comments' THEN
    SELECT p.tenant_id INTO _tid FROM public.posts p WHERE p.id = NEW.post_id;
  ELSE
    _tid := NEW.tenant_id;
  END IF;

  IF _tid IS NOT NULL AND public.is_tenant_locked(_tid) THEN
    RAISE EXCEPTION 'PLAN_LOCKED' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_enforce_lock ON public.posts;
CREATE TRIGGER posts_enforce_lock
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_lock_only();

DROP TRIGGER IF EXISTS post_images_enforce_lock ON public.post_images;
CREATE TRIGGER post_images_enforce_lock
  BEFORE INSERT OR UPDATE ON public.post_images
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_lock_only();

DROP TRIGGER IF EXISTS post_comments_enforce_lock ON public.post_comments;
CREATE TRIGGER post_comments_enforce_lock
  BEFORE INSERT OR UPDATE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_lock_only();

DROP TRIGGER IF EXISTS brainstorm_enforce_lock ON public.brainstorm_ideas;
CREATE TRIGGER brainstorm_enforce_lock
  BEFORE INSERT OR UPDATE ON public.brainstorm_ideas
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_lock_only();

-- 7) AJUSTE em create_tenant_with_owner: criar subscription em trial de 14d (agencia)
CREATE OR REPLACE FUNCTION public.create_tenant_with_owner(_tenant_name text, _full_name text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (_user_id, _tenant_id, 'owner');

  PERFORM public.seed_default_roles_for_tenant(_tenant_id);

  -- subscription em trial de 14 dias no plano agencia
  SELECT id INTO _agencia_plan_id FROM public.plans WHERE code = 'agencia';
  INSERT INTO public.tenant_subscriptions (tenant_id, plan_id, status, trial_ends_at)
  VALUES (_tenant_id, _agencia_plan_id, 'trialing', now() + interval '14 days');

  RETURN jsonb_build_object('tenant_id', _tenant_id);
END;
$$;

-- 8) BACKFILL: tenants existentes recebem PRO com plan_override=true
INSERT INTO public.tenant_subscriptions (tenant_id, plan_id, status, plan_override)
SELECT t.id, (SELECT id FROM public.plans WHERE code='pro'), 'active', true
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_subscriptions ts WHERE ts.tenant_id = t.id
);
