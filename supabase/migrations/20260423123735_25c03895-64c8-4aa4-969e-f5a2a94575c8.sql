
-- 1. Fix has_role() to be tenant-scoped
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = _user_id
          AND ur.role = _role
          AND ur.tenant_id = public.get_user_tenant_id(_user_id)
    )
$function$;

-- 2. Restrict user_roles INSERT: only one initial role, only 'member'
DROP POLICY IF EXISTS "Allow role creation during signup" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

CREATE POLICY "Signup: insert own initial member role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'member'::app_role
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  )
);

-- Allow the first user of a brand new tenant to become owner during onboarding,
-- but only if they currently have no roles at all.
CREATE POLICY "Signup: insert own initial owner role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'owner'::app_role
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  )
);

-- 3. Fix invitations SELECT policy: drop the overly broad one
DROP POLICY IF EXISTS "Authenticated users can validate invitation by token" ON public.invitations;

-- 4. Add comment length CHECK constraint
ALTER TABLE public.post_comments
  ADD CONSTRAINT post_comments_content_length_check
  CHECK (char_length(content) BETWEEN 1 AND 2000);
