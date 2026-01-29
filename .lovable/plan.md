

## Sistema de Permissoes por Cliente

### Visao Geral
Implementar controle de acesso granular onde, ao convidar um usuario ou gerenciar membros, o owner pode definir quais clientes o membro tera acesso. Os posts herdam automaticamente a permissao do cliente associado.

### Arquitetura do Sistema

```text
┌─────────────────────────────────────────────────────────────────┐
│                    MODELO DE PERMISSOES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   OWNER                                                         │
│   └── Acesso total a todos os clientes e posts                 │
│                                                                 │
│   MEMBER                                                        │
│   └── Acesso apenas aos clientes atribuidos                    │
│       └── Ve posts dos clientes que tem acesso                 │
│                                                                 │
│  ┌─────────────┐      ┌────────────────────┐      ┌──────────┐ │
│  │   user_id   │──────│ user_client_access │──────│ client_id│ │
│  └─────────────┘      └────────────────────┘      └──────────┘ │
│                              │                                  │
│                        tenant_id                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Banco de Dados

**Nova tabela: `user_client_access`**

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Chave primaria |
| user_id | UUID | FK para auth.users |
| client_id | UUID | FK para clients |
| tenant_id | UUID | FK para tenants |
| created_at | TIMESTAMPTZ | Data de criacao |

**Modificacao na tabela `invitations`:**

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| client_ids | UUID[] | Array de IDs de clientes permitidos (null = todos) |

**Funcao SQL auxiliar:**

```sql
-- Verifica se usuario tem acesso ao cliente
CREATE OR REPLACE FUNCTION has_client_access(_user_id UUID, _client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    -- Owner tem acesso a tudo
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = _user_id AND role = 'owner'
    )
    OR
    -- Membro com acesso especifico ao cliente
    EXISTS (
      SELECT 1 FROM user_client_access 
      WHERE user_id = _user_id AND client_id = _client_id
    )
$$;
```

### Atualizacao das Policies RLS

**Tabela `clients`:**
```sql
-- Substituir policy atual
CREATE POLICY "Users can view clients with access"
ON public.clients FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR EXISTS (
      SELECT 1 FROM user_client_access 
      WHERE user_id = auth.uid() AND client_id = clients.id
    )
  )
);
```

**Tabela `posts`:**
```sql
-- Substituir policy atual
CREATE POLICY "Users can view posts with client access"
ON public.posts FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR has_client_access(auth.uid(), client_id)
  )
);
```

### Fluxo de Convite com Permissoes

```text
┌─────────────────────────────────────────────────────────────────┐
│                 TELA DE CONVITE ATUALIZADA                      │
├─────────────────────────────────────────────────────────────────┤
│  Email:  [ email@exemplo.com                               ]    │
│                                                                 │
│  Papel:  [ Membro ▼ ]                                          │
│                                                                 │
│  Acesso a clientes:                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ( ) Todos os clientes                                   │   │
│  │  (●) Clientes selecionados:                              │   │
│  │      [✓] Cliente A                                       │   │
│  │      [ ] Cliente B                                       │   │
│  │      [✓] Cliente C                                       │   │
│  │      [ ] Cliente D                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                              [Cancelar] [Criar convite]         │
└─────────────────────────────────────────────────────────────────┘
```

### Componentes a Criar/Modificar

**1. Novo Componente: `ClientAccessSelector`**
- Checkbox list de clientes
- Toggle entre "todos" e "selecionados"
- Usado no InviteDialog e na edicao de permissoes de membro

**2. Modificar: `InviteDialog`**
- Adicionar secao de selecao de clientes quando role = 'member'
- Armazenar client_ids no convite

**3. Novo Componente: `MemberPermissionsDialog`**
- Acessivel na TeamList
- Permite owner editar permissoes de um membro existente
- Lista clientes com checkboxes

**4. Modificar: `useInvitations`**
- Aceitar client_ids ao criar convite
- Ao aceitar convite, criar registros em user_client_access

**5. Novo Hook: `useUserClientAccess`**
- CRUD para permissoes de acesso a clientes
- Listar clientes que usuario tem acesso
- Atualizar permissoes de um membro

### Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/settings/ClientAccessSelector.tsx` | Componente de selecao de clientes |
| `src/components/settings/MemberPermissionsDialog.tsx` | Dialog para editar permissoes de membro |
| `src/hooks/useUserClientAccess.ts` | Hook para gerenciar permissoes |

### Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/settings/InviteDialog.tsx` | Adicionar selecao de clientes |
| `src/components/settings/TeamList.tsx` | Botao de editar permissoes |
| `src/hooks/useInvitations.ts` | Suporte a client_ids |
| `src/hooks/useClients.ts` | Filtrar por acesso do usuario |
| `src/hooks/usePosts.ts` | Filtrar por clientes com acesso |

### Migracao SQL

```sql
-- Tabela de acesso usuario-cliente
CREATE TABLE public.user_client_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, client_id)
);

ALTER TABLE public.user_client_access ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_user_client_access_user_id ON public.user_client_access(user_id);
CREATE INDEX idx_user_client_access_client_id ON public.user_client_access(client_id);
CREATE INDEX idx_user_client_access_tenant_id ON public.user_client_access(tenant_id);

-- Adicionar coluna client_ids na tabela invitations
ALTER TABLE public.invitations ADD COLUMN client_ids UUID[] DEFAULT NULL;

-- Funcao para verificar acesso ao cliente
CREATE OR REPLACE FUNCTION public.has_client_access(_user_id UUID, _client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = _user_id AND role = 'owner'
    )
    OR
    EXISTS (
      SELECT 1 FROM user_client_access 
      WHERE user_id = _user_id AND client_id = _client_id
    )
$$;

-- RLS Policies para user_client_access

-- Owners podem ver acessos do seu tenant
CREATE POLICY "Owners can view client access"
ON public.user_client_access FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner')
);

-- Owners podem criar acessos
CREATE POLICY "Owners can create client access"
ON public.user_client_access FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner')
);

-- Owners podem deletar acessos
CREATE POLICY "Owners can delete client access"
ON public.user_client_access FOR DELETE TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner')
);

-- Usuario pode ver seus proprios acessos
CREATE POLICY "Users can view own client access"
ON public.user_client_access FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Atualizar policies de clients para considerar acesso granular
DROP POLICY IF EXISTS "Users can view clients in own tenant" ON public.clients;

CREATE POLICY "Users can view clients with access"
ON public.clients FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR has_client_access(auth.uid(), id)
  )
);

-- Apenas owners podem criar/editar/deletar clientes
DROP POLICY IF EXISTS "Users can create clients in own tenant" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients in own tenant" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients in own tenant" ON public.clients;

CREATE POLICY "Owners can create clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner')
);

CREATE POLICY "Users with access can update clients"
ON public.clients FOR UPDATE TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR has_client_access(auth.uid(), id)
  )
)
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR has_client_access(auth.uid(), id)
  )
);

CREATE POLICY "Owners can delete clients"
ON public.clients FOR DELETE TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner')
);

-- Atualizar policies de posts
DROP POLICY IF EXISTS "Users can view posts in own tenant" ON public.posts;
DROP POLICY IF EXISTS "Users can create posts in own tenant" ON public.posts;
DROP POLICY IF EXISTS "Users can update posts in own tenant" ON public.posts;
DROP POLICY IF EXISTS "Users can delete posts in own tenant" ON public.posts;

CREATE POLICY "Users can view posts with client access"
ON public.posts FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR has_client_access(auth.uid(), client_id)
  )
);

CREATE POLICY "Users can create posts with client access"
ON public.posts FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR has_client_access(auth.uid(), client_id)
  )
);

CREATE POLICY "Users can update posts with client access"
ON public.posts FOR UPDATE TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR has_client_access(auth.uid(), client_id)
  )
)
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR has_client_access(auth.uid(), client_id)
  )
);

CREATE POLICY "Users can delete posts with client access"
ON public.posts FOR DELETE TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR has_client_access(auth.uid(), client_id)
  )
);

-- Atualizar policies de post_images (herda do post/client)
DROP POLICY IF EXISTS "Users can view post images in own tenant" ON public.post_images;
DROP POLICY IF EXISTS "Users can create post images in own tenant" ON public.post_images;
DROP POLICY IF EXISTS "Users can update post images in own tenant" ON public.post_images;
DROP POLICY IF EXISTS "Users can delete post images in own tenant" ON public.post_images;

CREATE POLICY "Users can view post images with access"
ON public.post_images FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_images.post_id 
      AND has_client_access(auth.uid(), posts.client_id)
    )
  )
);

CREATE POLICY "Users can create post images with access"
ON public.post_images FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_images.post_id 
      AND has_client_access(auth.uid(), posts.client_id)
    )
  )
);

CREATE POLICY "Users can update post images with access"
ON public.post_images FOR UPDATE TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_images.post_id 
      AND has_client_access(auth.uid(), posts.client_id)
    )
  )
);

CREATE POLICY "Users can delete post images with access"
ON public.post_images FOR DELETE TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'owner')
    OR EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_images.post_id 
      AND has_client_access(auth.uid(), posts.client_id)
    )
  )
);
```

### Interface de Usuario

**No TeamList - Indicador de permissoes:**
```text
┌─────────────────────────────────────────────────────────────────┐
│  Maria Silva                                                    │
│  maria@email.com                                               │
│  Membro • 3 clientes                          [Editar] [Remover]│
└─────────────────────────────────────────────────────────────────┘
```

**Dialog de edicao de permissoes:**
```text
┌─────────────────────────────────────────────────────────────────┐
│  Permissoes de Maria Silva                              [X]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Selecione os clientes que este membro pode acessar:           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [✓] Cliente A                                          │   │
│  │  [ ] Cliente B                                          │   │
│  │  [✓] Cliente C                                          │   │
│  │  [✓] Cliente D                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  O membro podera ver e editar posts dos clientes              │
│  selecionados acima.                                           │
│                                                                 │
│                                       [Cancelar] [Salvar]       │
└─────────────────────────────────────────────────────────────────┘
```

### Detalhes Tecnicos

1. **Owners tem acesso total**: A funcao `has_client_access` verifica primeiro se o usuario e owner
2. **Heranca de permissoes**: Posts herdam permissao do cliente associado
3. **Convites com permissoes**: Os client_ids sao salvos no convite e aplicados ao aceitar
4. **Edicao posterior**: Owner pode modificar permissoes de membros existentes a qualquer momento
5. **Novos clientes**: Novos clientes criados nao sao automaticamente atribuidos aos membros

### Ordem de Implementacao

1. Migracao SQL (tabela user_client_access, funcao, policies atualizadas)
2. Hook useUserClientAccess
3. Componente ClientAccessSelector
4. Modificar InviteDialog para incluir selecao de clientes
5. Modificar useInvitations para criar acessos ao aceitar convite
6. Componente MemberPermissionsDialog
7. Modificar TeamList para exibir/editar permissoes

