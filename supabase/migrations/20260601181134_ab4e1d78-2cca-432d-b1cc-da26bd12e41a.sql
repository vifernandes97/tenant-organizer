DROP POLICY IF EXISTS "Signup: insert own initial member role" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;