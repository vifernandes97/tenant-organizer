

## Correção: Convites Mostrando "Inválido" para Usuários Não Logados

### Causa Raiz

A alteração de segurança feita anteriormente restringiu a leitura de convites apenas para usuários autenticados. Isso quebrou o fluxo normal onde:

1. Usuário recebe link de convite por email
2. Acessa a página `/convite/:token` **sem estar logado**
3. Sistema valida o token e mostra "Você foi convidado para [Tenant]"
4. Usuário escolhe criar conta ou fazer login
5. Após autenticação, aceita o convite

O problema está na **etapa 3** - o sistema não consegue validar o token porque a política RLS exige `auth.uid() IS NOT NULL`.

### Solução

Criar uma função RPC `SECURITY DEFINER` para validar convites de forma segura, sem expor dados sensíveis:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Fluxo Atual (Quebrado)                                               │
│                                                                      │
│ Anônimo → SELECT invitations → RLS BLOQUEIA → "Convite Inválido"   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Fluxo Corrigido                                                      │
│                                                                      │
│ Anônimo → RPC validate_invitation_token → Retorna dados seguros     │
│           (SECURITY DEFINER)               (email, tenant_name)      │
└─────────────────────────────────────────────────────────────────────┘
```

### Alterações Necessárias

#### 1. Nova Função RPC (Migração SQL)

Criar função `validate_invitation_token` que:
- É `SECURITY DEFINER` (bypassa RLS)
- Recebe o token como parâmetro
- Valida se existe, está pendente e não expirou
- Retorna apenas dados necessários: `valid`, `email`, `tenant_name`
- Não expõe outros campos sensíveis

```sql
CREATE OR REPLACE FUNCTION validate_invitation_token(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record record;
  tenant_name_val text;
BEGIN
  SELECT i.*, t.name as tenant_name
  INTO invitation_record
  FROM invitations i
  INNER JOIN tenants t ON t.id = i.tenant_id
  WHERE i.token = _token
    AND i.status = 'pending'
    AND i.expires_at > now();
  
  IF invitation_record IS NULL THEN
    RETURN jsonb_build_object('valid', false);
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'email', invitation_record.email,
    'tenant_name', invitation_record.tenant_name
  );
END;
$$;
```

#### 2. Atualizar Hook `useInvitations.ts`

Modificar a função `validateToken` para usar a nova RPC:

```typescript
const validateToken = useCallback(async (token: string) => {
  const { data, error } = await supabase
    .rpc('validate_invitation_token', { _token: token });

  if (error || !data?.valid) {
    return { valid: false, invitation: null };
  }

  return {
    valid: true,
    invitation: { email: data.email } as Partial<Invitation>,
    tenantName: data.tenant_name || 'Organização',
  };
}, []);
```

#### 3. Ajustar `AcceptInvite.tsx`

Pequeno ajuste para usar apenas os campos retornados pela nova RPC.

### Resumo dos Arquivos

| Arquivo | Ação |
|---------|------|
| Nova migração SQL | Criar função `validate_invitation_token` |
| `src/hooks/useInvitations.ts` | Usar RPC ao invés de SELECT direto |
| `src/pages/AcceptInvite.tsx` | Ajustar uso do inviteEmail |

### Segurança Mantida

- Tokens UUID são criptograficamente aleatórios (2^128 valores)
- A RPC só retorna dados se o token exato for fornecido
- Não há como enumerar convites ou emails
- A aceitação do convite ainda exige autenticação com o email correto

