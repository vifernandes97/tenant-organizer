
CREATE TABLE public.brainstorm_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.brainstorm_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ideas in own tenant"
  ON public.brainstorm_ideas FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can create ideas in own tenant"
  ON public.brainstorm_ideas FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Users can update ideas in own tenant"
  ON public.brainstorm_ideas FOR UPDATE
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete ideas in own tenant"
  ON public.brainstorm_ideas FOR DELETE
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND (created_by = auth.uid() OR has_role(auth.uid(), 'owner'::app_role)));

CREATE TRIGGER update_brainstorm_ideas_updated_at
  BEFORE UPDATE ON public.brainstorm_ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
