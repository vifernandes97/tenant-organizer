-- Drop and recreate the tenant insert policy to be more permissive
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;

-- Create policy that works for any authenticated user
CREATE POLICY "Authenticated users can create tenants"
ON public.tenants FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Also need to fix profiles policy - users should be able to insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Fix user_roles policy - users should be able to insert their own role during signup
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

CREATE POLICY "Users can insert own role"
ON public.user_roles FOR INSERT
WITH CHECK (auth.uid() = user_id);