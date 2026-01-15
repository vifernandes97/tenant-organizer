-- Fix the permissive tenant creation policy to be more secure
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow tenant creation during signup" ON public.tenants;

-- Create a more secure policy that still allows signup flow
-- Users can only create a tenant and immediately reference it in their profile
CREATE POLICY "Authenticated users can create tenants"
ON public.tenants FOR INSERT
TO authenticated
WITH CHECK (
    -- Only allow if user doesn't already have a tenant
    NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND tenant_id IS NOT NULL
    )
);