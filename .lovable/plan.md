

## Corrigir Erro de Chave Duplicada ao Aceitar Convite

### Problema Identificado

O erro `duplicate key value violates unique constraint "user_roles_user_id_tenant_id_key"` ocorre porque a função `acceptInvitation` sempre tenta fazer um `INSERT` na tabela `user_roles`, sem verificar se o registro já existe.

**Cenários que causam o erro:**
1. Usuário tenta aceitar o convite, falha em algum passo posterior, e tenta novamente
2. Usuário já faz parte do tenant (por algum motivo) e recebe novo convite
3. Race condition onde a mutation é executada mais de uma vez

### Solução

Usar `upsert` em vez de `insert` para a criação do `user_role`. O upsert vai:
- Inserir o registro se não existir
- Atualizar o registro se já existir (no caso, apenas atualizar o role)

### Mudanças no Código

**Arquivo:** `src/hooks/useInvitations.ts`

```tsx
// De (atual - linha 221-230):
const { error: roleError } = await supabase
  .from('user_roles')
  .insert({
    user_id: userId,
    tenant_id: invitation.tenant_id,
    role: invitation.role,
  });

// Para (novo):
const { error: roleError } = await supabase
  .from('user_roles')
  .upsert(
    {
      user_id: userId,
      tenant_id: invitation.tenant_id,
      role: invitation.role,
    },
    {
      onConflict: 'user_id,tenant_id',
    }
  );
```

### Benefícios

- Aceitar convite funciona mesmo se o usuário tentar novamente após um erro
- Se o usuário já tinha um role no tenant, o convite atualiza o role (ex: de member para owner)
- Elimina possíveis race conditions

### Impacto Adicional

Aplicar a mesma lógica ao `user_client_access` (linha 240-242) para evitar erros similares:

```tsx
// De:
.insert(accessInserts);

// Para:
.upsert(accessInserts, { onConflict: 'user_id,client_id' });
```

### Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useInvitations.ts` | Alterar `insert` para `upsert` em user_roles e user_client_access |

