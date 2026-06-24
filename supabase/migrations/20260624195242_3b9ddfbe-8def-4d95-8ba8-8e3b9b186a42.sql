
CREATE TABLE public.post_caption_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  caption text,
  edited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_caption_history_post ON public.post_caption_history(post_id, created_at DESC);
CREATE INDEX idx_post_caption_history_tenant ON public.post_caption_history(tenant_id);

GRANT SELECT ON public.post_caption_history TO authenticated;
GRANT ALL ON public.post_caption_history TO service_role;

ALTER TABLE public.post_caption_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view caption history"
  ON public.post_caption_history FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Trigger function: salva versão anterior quando caption muda
CREATE OR REPLACE FUNCTION public.log_post_caption_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(OLD.caption, '') IS DISTINCT FROM COALESCE(NEW.caption, '') THEN
    INSERT INTO public.post_caption_history (post_id, tenant_id, caption, edited_by)
    VALUES (OLD.id, OLD.tenant_id, OLD.caption, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_post_caption_change
  BEFORE UPDATE OF caption ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_post_caption_change();
