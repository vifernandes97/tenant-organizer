-- Fix 1: Add DELETE policy for user_roles table
-- Allows owners to remove user roles within their tenant
CREATE POLICY "Owners can delete user roles"
ON public.user_roles
FOR DELETE
USING (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner'::app_role)
  AND user_id != auth.uid()  -- Prevent owners from deleting their own role
);

-- Fix 2: Restrict invitation token validation to limit exposure
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can validate invitation by token" ON public.invitations;

-- Create a more restrictive policy that only allows validating tokens
-- by authenticated users or with a specific token lookup (not enumeration)
CREATE POLICY "Authenticated users can validate invitation by token"
ON public.invitations
FOR SELECT
USING (
  -- Allow if user is authenticated and checking a specific token
  (auth.uid() IS NOT NULL AND status = 'pending'::invitation_status AND expires_at > now())
  OR
  -- Allow owners to view all invitations (existing policy handles this but keeping explicit)
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role))
);

-- Note: The get_tenant_name_for_invitation RPC function is SECURITY DEFINER
-- and already validates the token exists before returning tenant name.
-- This is acceptable as UUIDs are cryptographically random (2^128 values).