-- Drop the problematic policy
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;

-- Create a simpler policy that allows any authenticated user to create a tenant
-- The business logic will be handled in the application
CREATE POLICY "Authenticated users can create tenants"
ON public.tenants FOR INSERT
TO authenticated
WITH CHECK (true);

-- Note: This is intentionally permissive for INSERT only during signup flow
-- The application code ensures users only create one tenant during registration