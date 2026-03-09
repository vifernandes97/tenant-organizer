
-- Create client_post_statuses table
CREATE TABLE public.client_post_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  color text NOT NULL DEFAULT '#6b7280',
  icon text NOT NULL DEFAULT 'file-text',
  display_order integer NOT NULL DEFAULT 0,
  is_final boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add unique constraint on client_id + slug
ALTER TABLE public.client_post_statuses ADD CONSTRAINT client_post_statuses_client_slug_unique UNIQUE (client_id, slug);

-- Enable RLS
ALTER TABLE public.client_post_statuses ENABLE ROW LEVEL SECURITY;

-- RLS policies (same as clients: tenant isolation + client access)
CREATE POLICY "Users can view client post statuses with access"
ON public.client_post_statuses FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_client_access(auth.uid(), client_id))
);

CREATE POLICY "Owners can create client post statuses"
ON public.client_post_statuses FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
  AND has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Owners can update client post statuses"
ON public.client_post_statuses FOR UPDATE TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Owners can delete client post statuses"
ON public.client_post_statuses FOR DELETE TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND has_role(auth.uid(), 'owner'::app_role)
);

-- Add custom_status_id to posts table
ALTER TABLE public.posts ADD COLUMN custom_status_id uuid REFERENCES public.client_post_statuses(id) ON DELETE SET NULL;
