-- Permitir validação de convite por token (mesmo sem autenticação)
-- Isso permite que a página de convite carregue informações do convite
-- antes do usuário fazer login
CREATE POLICY "Anyone can validate invitation by token"
ON public.invitations FOR SELECT
TO anon, authenticated
USING (status = 'pending' AND expires_at > now());