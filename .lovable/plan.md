
# Visualizar e revogar acesso de usuarios nas Configuracoes

## Problema atual

A pagina de Configuracoes ja possui o componente `TeamList` com UI para listar membros e botao de remover. Porem, ha dois problemas de seguranca no banco (RLS) que impedem o funcionamento:

1. **Profiles SELECT**: a politica atual so permite visualizar o proprio perfil (`id = auth.uid()`). Owners nao conseguem ver nomes/avatares de outros membros do tenant.
2. **Profiles UPDATE**: a politica so permite atualizar o proprio perfil. Quando o owner tenta remover um membro (setar `tenant_id = null`), a operacao falha silenciosamente.

## Solucao

### 1. Adicionar politica RLS no profiles (SELECT)

Permitir que usuarios do mesmo tenant visualizem perfis uns dos outros:

```sql
CREATE POLICY "Users can view profiles in same tenant"
ON public.profiles FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));
```

### 2. Criar funcao RPC para remocao segura de membro

Em vez de adicionar politica UPDATE permissiva no profiles, criar uma funcao `SECURITY DEFINER` que realiza a remocao atomicamente:

- Valida que quem chama e owner do tenant
- Remove `user_roles` do membro
- Remove `user_client_access` do membro
- Seta `tenant_id = null` no profile do membro

```sql
CREATE OR REPLACE FUNCTION public.remove_team_member(_member_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
BEGIN
  -- Verificar que o chamador e owner
  SELECT tenant_id INTO _tenant_id FROM profiles WHERE id = auth.uid();
  
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND tenant_id = _tenant_id AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Sem permissao';
  END IF;

  -- Verificar que o membro pertence ao mesmo tenant
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = _member_id AND tenant_id = _tenant_id
  ) THEN
    RAISE EXCEPTION 'Membro nao encontrado';
  END IF;

  -- Nao permitir remover a si mesmo
  IF _member_id = auth.uid() THEN
    RAISE EXCEPTION 'Nao e possivel remover a si mesmo';
  END IF;

  -- Remover acessos a clientes
  DELETE FROM user_client_access WHERE user_id = _member_id AND tenant_id = _tenant_id;
  -- Remover role
  DELETE FROM user_roles WHERE user_id = _member_id AND tenant_id = _tenant_id;
  -- Desvincular do tenant
  UPDATE profiles SET tenant_id = NULL WHERE id = _member_id;

  RETURN true;
END;
$$;
```

### 3. Atualizar `useTeamMembers.ts`

Alterar a mutation `removeMember` para chamar a RPC em vez de fazer queries diretas:

```typescript
const { error } = await supabase.rpc('remove_team_member', { _member_id: memberId });
```

Isso simplifica o codigo e garante que todas as operacoes de limpeza ocorram atomicamente.

## Arquivos alterados

- **Migracao SQL**: nova politica RLS em profiles + funcao `remove_team_member`
- **`src/hooks/useTeamMembers.ts`**: simplificar `removeMemberMutation` para usar RPC

## Resultado

- Owners verao todos os membros do tenant com nomes e avatares corretos
- Botao de remover funcionara corretamente, limpando roles, acessos a clientes e desvinculando do tenant
- Membros comuns continuarao vendo apenas seu proprio perfil (a politica existente ja cobre isso)
