

## Corrigir Loop Infinito na Página de Registro com Convite

### Problemas Identificados

**Problema 1: Loop infinito no useEffect**

A função `validateToken` no hook `useAcceptInvitation` é definida diretamente no corpo do hook, sendo recriada a cada render. Como ela está nas dependências do `useEffect` em `Register.tsx`, isso causa um loop infinito.

```tsx
// Register.tsx
useEffect(() => {
  const checkInvite = async () => {
    // ...
    const result = await validateToken(inviteToken);
    // ...
  };
  checkInvite();
}, [inviteToken, validateToken]); // ← validateToken muda toda hora!
```

**Problema 2: RLS bloqueia nome do tenant**

Quando `validateToken` tenta buscar o nome do tenant do convite, a política RLS só permite que usuários vejam seu próprio tenant:

```sql
-- Política atual
USING (id = get_user_tenant_id(auth.uid())) -- Só próprio tenant!
```

Usuários anônimos ou de outro tenant não conseguem ver o nome, resultando em "Carregando..." eterno se a query falhar silenciosamente.

### Solução

**Parte 1: Envolver validateToken com useCallback**

Memoizar a função `validateToken` para que não seja recriada a cada render:

```tsx
// useInvitations.ts
const validateToken = useCallback(async (token: string) => {
  // ... código atual
}, []); // Sem dependências = função estável
```

**Parte 2: Adicionar política RLS para leitura de tenant por convite**

Criar uma função security definer que permita ler o nome do tenant quando o usuário tem um convite válido para ele:

```sql
-- Função para validar acesso ao tenant via convite
CREATE OR REPLACE FUNCTION public.get_tenant_name_for_invitation(invitation_token uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_name text;
BEGIN
  SELECT t.name INTO tenant_name
  FROM tenants t
  INNER JOIN invitations i ON i.tenant_id = t.id
  WHERE i.token = invitation_token
    AND i.status = 'pending'
    AND i.expires_at > now();
  
  RETURN tenant_name;
END;
$$;
```

E atualizar o hook para usar essa função RPC em vez de query direta.

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useInvitations.ts` | Envolver `validateToken` com `useCallback` e usar RPC para buscar tenant name |
| Nova migração SQL | Criar função `get_tenant_name_for_invitation` |

### Sequência de Implementação

1. Criar migração SQL com a função `get_tenant_name_for_invitation`
2. Atualizar `useInvitations.ts`:
   - Importar `useCallback` do React
   - Envolver `validateToken` com `useCallback`
   - Substituir query direta ao tenants por chamada RPC

### Código Final

**useInvitations.ts (trecho relevante):**

```tsx
import { useCallback } from 'react';

const validateToken = useCallback(async (token: string) => {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return { valid: false, invitation: null };
  }

  // Usar RPC para buscar nome do tenant (bypassa RLS)
  const { data: tenantName } = await supabase
    .rpc('get_tenant_name_for_invitation', { invitation_token: token });

  return {
    valid: true,
    invitation: data as Invitation,
    tenantName: tenantName || 'Organização',
  };
}, []);
```

