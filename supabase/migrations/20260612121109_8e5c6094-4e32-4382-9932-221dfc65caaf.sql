
-- 1. Block direct inserts on user_roles (only SECURITY DEFINER functions may insert)
CREATE POLICY "Block direct inserts on user_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (false);

-- 2. Restrict post_comments policies to authenticated only
DROP POLICY IF EXISTS "Users can create comments with post access" ON public.post_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can view comments with post access" ON public.post_comments;

CREATE POLICY "Users can view comments with post access"
ON public.post_comments FOR SELECT TO authenticated
USING (
  (tenant_id = get_user_tenant_id(auth.uid()))
  AND (
    has_role(auth.uid(), 'owner'::app_role)
    OR EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_comments.post_id
        AND has_client_access(auth.uid(), posts.client_id)
    )
  )
);

CREATE POLICY "Users can create comments with post access"
ON public.post_comments FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
  AND author_id = auth.uid()
  AND (
    has_role(auth.uid(), 'owner'::app_role)
    OR EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_comments.post_id
        AND has_client_access(auth.uid(), posts.client_id)
    )
  )
);

CREATE POLICY "Users can update own comments"
ON public.post_comments FOR UPDATE TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (author_id = auth.uid() OR has_role(auth.uid(), 'owner'::app_role))
);

CREATE POLICY "Users can delete own comments"
ON public.post_comments FOR DELETE TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (author_id = auth.uid() OR has_role(auth.uid(), 'owner'::app_role))
);

-- 3. Restrict tenant updates to owners only
DROP POLICY IF EXISTS "Users can update own tenant" ON public.tenants;
CREATE POLICY "Owners can update own tenant"
ON public.tenants FOR UPDATE TO authenticated
USING (id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));
