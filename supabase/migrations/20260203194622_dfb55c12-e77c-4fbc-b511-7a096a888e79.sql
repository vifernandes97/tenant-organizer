-- Recriar a política "User can accept own invitation" como PERMISSIVE
-- PERMISSIVE é o padrão, então não precisa especificar
DROP POLICY IF EXISTS "User can accept own invitation" ON invitations;

CREATE POLICY "User can accept own invitation"
ON invitations
FOR UPDATE
USING (
  (email = auth.email()) 
  AND (status = 'pending'::invitation_status)
)
WITH CHECK (email = auth.email());