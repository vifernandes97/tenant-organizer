-- Enum para status do comentário
CREATE TYPE public.comment_status AS ENUM ('open', 'resolved');

-- Tabela de comentários em imagens
CREATE TABLE public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    image_id UUID REFERENCES public.post_images(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    x_position DECIMAL(5,2),
    y_position DECIMAL(5,2),
    status public.comment_status NOT NULL DEFAULT 'open',
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    parent_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX idx_post_comments_image_id ON public.post_comments(image_id);
CREATE INDEX idx_post_comments_status ON public.post_comments(status);

-- Enable RLS
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies seguindo o padrão existente (usando has_client_access via post)
CREATE POLICY "Users can view comments with post access"
ON public.post_comments
FOR SELECT
USING (
    tenant_id = get_user_tenant_id(auth.uid()) 
    AND (
        has_role(auth.uid(), 'owner'::app_role) 
        OR EXISTS (
            SELECT 1 FROM public.posts 
            WHERE posts.id = post_comments.post_id 
            AND has_client_access(auth.uid(), posts.client_id)
        )
    )
);

CREATE POLICY "Users can create comments with post access"
ON public.post_comments
FOR INSERT
WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND author_id = auth.uid()
    AND (
        has_role(auth.uid(), 'owner'::app_role) 
        OR EXISTS (
            SELECT 1 FROM public.posts 
            WHERE posts.id = post_comments.post_id 
            AND has_client_access(auth.uid(), posts.client_id)
        )
    )
);

CREATE POLICY "Users can update own comments"
ON public.post_comments
FOR UPDATE
USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
        author_id = auth.uid()
        OR has_role(auth.uid(), 'owner'::app_role)
    )
);

CREATE POLICY "Users can delete own comments"
ON public.post_comments
FOR DELETE
USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
        author_id = auth.uid()
        OR has_role(auth.uid(), 'owner'::app_role)
    )
);

-- Trigger para updated_at
CREATE TRIGGER update_post_comments_updated_at
BEFORE UPDATE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();