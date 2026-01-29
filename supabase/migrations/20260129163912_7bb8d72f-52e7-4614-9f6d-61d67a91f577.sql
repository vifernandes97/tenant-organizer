-- Tabela de acesso usuario-cliente
CREATE TABLE public.user_client_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, client_id)
);

ALTER TABLE public.user_client_access ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_user_client_access_user_id ON public.user_client_access(user_id);
CREATE INDEX idx_user_client_access_client_id ON public.user_client_access(client_id);
CREATE INDEX idx_user_client_access_tenant_id ON public.user_client_access(tenant_id);

-- Adicionar coluna client_ids na tabela invitations
ALTER TABLE public.invitations ADD COLUMN client_ids UUID[] DEFAULT NULL;

-- Funcao para verificar acesso ao cliente
CREATE OR REPLACE FUNCTION public.has_client_access(_user_id UUID, _client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = _user_id AND role = 'owner'
    )
    OR
    EXISTS (
      SELECT 1 FROM user_client_access 
      WHERE user_id = _user_id AND client_id = _client_id
    )
$$;

-- RLS Policies para user_client_access

-- Owners podem ver acessos do seu tenant
CREATE POLICY "Owners can view client access"
ON public.user_client_access FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner')
);

-- Owners podem criar acessos
CREATE POLICY "Owners can create client access"
ON public.user_client_access FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner')
);

-- Owners podem deletar acessos
CREATE POLICY "Owners can delete client access"
ON public.user_client_access FOR DELETE TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner')
);

-- Usuario pode ver seus proprios acessos
CREATE POLICY "Users can view own client access"
ON public.user_client_access FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Atualizar policies de clients para considerar acesso granular
DROP POLICY IF EXISTS "Users can view clients in own tenant" ON public.clients;

CREATE POLICY "Users can view clients with access"
ON public.clients FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR has_client_access(auth.uid(), id)
  )
);

-- Apenas owners podem criar/deletar clientes
DROP POLICY IF EXISTS "Users can create clients in own tenant" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients in own tenant" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients in own tenant" ON public.clients;

CREATE POLICY "Owners can create clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner')
);

CREATE POLICY "Users with access can update clients"
ON public.clients FOR UPDATE TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR has_client_access(auth.uid(), id)
  )
)
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR has_client_access(auth.uid(), id)
  )
);

CREATE POLICY "Owners can delete clients"
ON public.clients FOR DELETE TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner')
);

-- Atualizar policies de posts
DROP POLICY IF EXISTS "Users can view posts in own tenant" ON public.posts;
DROP POLICY IF EXISTS "Users can create posts in own tenant" ON public.posts;
DROP POLICY IF EXISTS "Users can update posts in own tenant" ON public.posts;
DROP POLICY IF EXISTS "Users can delete posts in own tenant" ON public.posts;

CREATE POLICY "Users can view posts with client access"
ON public.posts FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR has_client_access(auth.uid(), client_id)
  )
);

CREATE POLICY "Users can create posts with client access"
ON public.posts FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR has_client_access(auth.uid(), client_id)
  )
);

CREATE POLICY "Users can update posts with client access"
ON public.posts FOR UPDATE TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR has_client_access(auth.uid(), client_id)
  )
)
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR has_client_access(auth.uid(), client_id)
  )
);

CREATE POLICY "Users can delete posts with client access"
ON public.posts FOR DELETE TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR has_client_access(auth.uid(), client_id)
  )
);

-- Atualizar policies de post_images (herda do post/client)
DROP POLICY IF EXISTS "Users can view post images in own tenant" ON public.post_images;
DROP POLICY IF EXISTS "Users can create post images in own tenant" ON public.post_images;
DROP POLICY IF EXISTS "Users can update post images in own tenant" ON public.post_images;
DROP POLICY IF EXISTS "Users can delete post images in own tenant" ON public.post_images;

CREATE POLICY "Users can view post images with access"
ON public.post_images FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_images.post_id 
      AND has_client_access(auth.uid(), posts.client_id)
    )
  )
);

CREATE POLICY "Users can create post images with access"
ON public.post_images FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_images.post_id 
      AND has_client_access(auth.uid(), posts.client_id)
    )
  )
);

CREATE POLICY "Users can update post images with access"
ON public.post_images FOR UPDATE TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_images.post_id 
      AND has_client_access(auth.uid(), posts.client_id)
    )
  )
);

CREATE POLICY "Users can delete post images with access"
ON public.post_images FOR DELETE TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_images.post_id 
      AND has_client_access(auth.uid(), posts.client_id)
    )
  )
);