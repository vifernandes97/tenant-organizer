

## Corrigir Erro RLS ao Aceitar Convite

### Problema Identificado

O erro `new row violates row-level security policy for table "invitations"` ocorre porque as políticas de UPDATE na tabela `invitations` são **RESTRICTIVE**.

**Políticas atuais de UPDATE:**

| Política | Tipo | Expressão USING |
|----------|------|-----------------|
| `Owners can update invitations` | RESTRICTIVE | `tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'owner')` |
| `User can accept own invitation` | RESTRICTIVE | `email = auth.email() AND status = 'pending'` |

**Como RLS funciona com políticas RESTRICTIVE:**
- Quando há múltiplas políticas RESTRICTIVE, **TODAS** devem passar para a operação ser permitida
- O usuário convidado é `member`, não `owner`
- Portanto, a política "Owners can update invitations" **falha**
- Mesmo com a política "User can accept own invitation" passando, o UPDATE é negado

### Solução

Alterar a política `User can accept own invitation` para ser **PERMISSIVE** em vez de RESTRICTIVE.

**Como RLS funciona com políticas PERMISSIVE vs RESTRICTIVE:**
- Políticas PERMISSIVE: Se **qualquer uma** passar, a operação é permitida
- Políticas RESTRICTIVE: **Todas** precisam passar

Com a mudança, o usuário poderá aceitar o convite se:
- For owner do tenant (política existente), **OU**
- For o dono do email do convite (política permissiva)

### SQL da Migração

```sql
-- Recriar a política "User can accept own invitation" como PERMISSIVE
DROP POLICY IF EXISTS "User can accept own invitation" ON invitations;

CREATE POLICY "User can accept own invitation"
ON invitations
FOR UPDATE
USING (
  (email = auth.email()) 
  AND (status = 'pending'::invitation_status)
)
WITH CHECK (email = auth.email());
-- PERMISSIVE é o padrão, então não precisa especificar
```

### Arquivos Afetados

| Item | Mudança |
|------|---------|
| Nova migração SQL | Recriar política como PERMISSIVE |

### Resultado Esperado

Após a migração:
1. Owners podem atualizar qualquer convite do seu tenant
2. Usuários convidados podem aceitar seu próprio convite (mesmo sendo member)
3. As duas condições funcionam de forma **OU** em vez de **E**

