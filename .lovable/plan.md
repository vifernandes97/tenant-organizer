
## Corrigir Políticas RLS para Aceite de Convite

### Análise do Problema

Os logs de erro mostram falhas em **três tabelas diferentes** durante o aceite de convite:

| Tabela | Erro | Causa |
|--------|------|-------|
| `user_roles` | `new row violates row-level security policy (USING expression)` | Upsert precisa de política UPDATE, mas não existe |
| `user_client_access` | `new row violates row-level security policy` | Só owners podem inserir, usuário convidado é member |
| `invitations` | `new row violates row-level security policy` | Mesmo com política permissiva, o fluxo falha antes |

O fluxo atual em `acceptInvitation`:
1. Busca convite (SELECT) - OK
2. Atualiza profile com tenant_id (UPDATE) - OK
3. Upsert em user_roles - **FALHA** (sem política UPDATE)
4. Insert em user_client_access - **FALHA** (só owner pode)
5. Update em invitations - Nunca chega aqui

### Solução

Criar políticas que permitam ao **próprio usuário** configurar seu acesso durante o aceite do convite.

**Abordagem**: Usar `SECURITY DEFINER` functions para fazer as operações privilegiadas, bypassando RLS de forma segura e controlada.

### Migrações Necessárias

**1. Função para aceitar convite (SECURITY DEFINER)**

Esta função fará todas as operações necessárias em uma única transação com privilégios elevados:

```sql
CREATE OR REPLACE FUNCTION public.accept_invitation(
  _token uuid,
  _user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invitation record;
  _result jsonb;
BEGIN
  -- 1. Buscar e validar convite
  SELECT * INTO _invitation
  FROM invitations
  WHERE token = _token
    AND status = 'pending'
    AND expires_at > now();
  
  IF _invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite inválido ou expirado');
  END IF;
  
  -- 2. Verificar se email do usuário corresponde ao convite
  IF (SELECT email FROM auth.users WHERE id = _user_id) != _invitation.email THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email não corresponde ao convite');
  END IF;
  
  -- 3. Atualizar profile com tenant_id
  UPDATE profiles 
  SET tenant_id = _invitation.tenant_id
  WHERE id = _user_id;
  
  -- Se profile não existe, criar
  IF NOT FOUND THEN
    INSERT INTO profiles (id, tenant_id)
    VALUES (_user_id, _invitation.tenant_id);
  END IF;
  
  -- 4. Upsert user_role
  INSERT INTO user_roles (user_id, tenant_id, role)
  VALUES (_user_id, _invitation.tenant_id, _invitation.role)
  ON CONFLICT (user_id, tenant_id) 
  DO UPDATE SET role = EXCLUDED.role;
  
  -- 5. Criar acessos aos clientes (se houver)
  IF _invitation.client_ids IS NOT NULL AND array_length(_invitation.client_ids, 1) > 0 THEN
    INSERT INTO user_client_access (user_id, client_id, tenant_id)
    SELECT _user_id, unnest(_invitation.client_ids), _invitation.tenant_id
    ON CONFLICT (user_id, client_id) DO NOTHING;
  END IF;
  
  -- 6. Marcar convite como aceito
  UPDATE invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = _invitation.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', _invitation.tenant_id,
    'role', _invitation.role
  );
END;
$$;
```

**2. Atualizar código para usar a nova função**

Em `useInvitations.ts`, substituir toda a lógica de `acceptInvitationMutation` por uma única chamada RPC:

```tsx
const acceptInvitationMutation = useMutation({
  mutationFn: async ({ token, userId }: { token: string; userId: string }) => {
    const { data, error } = await supabase
      .rpc('accept_invitation', { 
        _token: token, 
        _user_id: userId 
      });

    if (error) throw error;
    
    if (!data?.success) {
      throw new Error(data?.error || 'Erro ao aceitar convite');
    }

    return data;
  },
  // ... callbacks permanecem iguais
});
```

### Arquivos Afetados

| Item | Mudança |
|------|---------|
| Nova migração SQL | Criar função `accept_invitation` |
| `src/hooks/useInvitations.ts` | Substituir lógica por chamada RPC |

### Benefícios da Solução

1. **Transação atômica**: Tudo acontece em uma única transação - se algo falhar, tudo é revertido
2. **Segurança**: A função valida o email antes de aceitar, impedindo aceite por email errado
3. **Sem políticas extras**: Não precisa criar múltiplas políticas complexas
4. **Manutenibilidade**: Lógica centralizada no banco, mais fácil de auditar
