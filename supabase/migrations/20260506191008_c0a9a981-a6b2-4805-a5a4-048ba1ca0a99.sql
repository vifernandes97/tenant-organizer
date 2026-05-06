CREATE TABLE public.tenant_api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX idx_tenant_api_tokens_tenant ON public.tenant_api_tokens(tenant_id);
CREATE INDEX idx_tenant_api_tokens_hash ON public.tenant_api_tokens(token_hash) WHERE revoked_at IS NULL;

ALTER TABLE public.tenant_api_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view tenant api tokens"
ON public.tenant_api_tokens FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can create tenant api tokens"
ON public.tenant_api_tokens FOR INSERT TO authenticated
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role) AND created_by = auth.uid());

CREATE POLICY "Owners can update tenant api tokens"
ON public.tenant_api_tokens FOR UPDATE TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can delete tenant api tokens"
ON public.tenant_api_tokens FOR DELETE TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

CREATE OR REPLACE FUNCTION public.validate_api_token(_token_hash text)
RETURNS TABLE(tenant_id uuid, created_by uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
BEGIN
  SELECT t.id, t.tenant_id, t.created_by INTO _row
  FROM public.tenant_api_tokens t
  WHERE t.token_hash = _token_hash AND t.revoked_at IS NULL
  LIMIT 1;

  IF _row IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.tenant_api_tokens SET last_used_at = now() WHERE id = _row.id;

  tenant_id := _row.tenant_id;
  created_by := _row.created_by;
  RETURN NEXT;
END;
$$;