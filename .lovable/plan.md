

## Sistema de Convite de Usuarios para Organizacao

### Visao Geral
Implementar um sistema completo de convite de usuarios que permite aos owners de uma organizacao (tenant) convidar novos membros por email. Os usuarios convidados receberao um link para criar conta e serao automaticamente vinculados a organizacao do convite.

### Arquitetura do Sistema

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE CONVITE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Owner cria convite     2. Email enviado      3. Usuario     │
│     com email do              com link de           clica no    │
│     convidado                 acesso                link        │
│         │                        │                    │         │
│         ▼                        ▼                    ▼         │
│  ┌─────────────┐         ┌─────────────┐      ┌─────────────┐   │
│  │ invitations │ ───────>│   EMAIL     │ ────>│ /convite/   │   │
│  │   table     │         │   SERVICE   │      │  {token}    │   │
│  └─────────────┘         └─────────────┘      └─────────────┘   │
│                                                      │          │
│                                                      ▼          │
│  4. Usuario cria conta   5. Vincula ao tenant   6. Acessa       │
│     (ou faz login se        automaticamente        dashboard    │
│      ja existir)                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Banco de Dados

**Nova tabela: `invitations`**

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | Chave primaria |
| tenant_id | UUID | FK para tenants |
| email | TEXT | Email do convidado |
| role | app_role | Papel atribuido (member por padrao) |
| token | UUID | Token unico para o link |
| invited_by | UUID | Usuario que criou o convite |
| status | TEXT | pending, accepted, expired, revoked |
| expires_at | TIMESTAMPTZ | Data de expiracao (7 dias) |
| accepted_at | TIMESTAMPTZ | Data de aceitacao |
| created_at | TIMESTAMPTZ | Data de criacao |

**Policies RLS:**
- Owner pode criar/visualizar/revogar convites do seu tenant
- Convites pendentes podem ser lidos por qualquer autenticado (para validar token)

### Componentes Frontend

**1. Pagina de Configuracoes (`src/pages/Settings.tsx`)**
- Substitui o placeholder atual em `/configuracoes`
- Tabs: Equipe, Organizacao (futuro)
- Lista membros atuais com seus papeis
- Botao "Convidar membro"

**2. Componente de Lista de Equipe (`src/components/settings/TeamList.tsx`)**
- Exibe membros atuais (profiles + user_roles do tenant)
- Badge indicando papel (Owner/Membro)
- Owner pode remover membros (exceto a si mesmo)

**3. Modal de Convite (`src/components/settings/InviteDialog.tsx`)**
- Campo de email
- Selecao de papel (member por padrao)
- Validacao de email
- Feedback de sucesso/erro

**4. Lista de Convites Pendentes (`src/components/settings/PendingInvites.tsx`)**
- Mostra convites ainda nao aceitos
- Opcao de reenviar ou revogar convite

**5. Pagina de Aceitacao de Convite (`src/pages/AcceptInvite.tsx`)**
- Rota: `/convite/:token`
- Valida o token
- Se usuario ja logado: vincula ao tenant
- Se nao logado: redireciona para registro com token

**6. Modificacao no Registro (`src/pages/Register.tsx`)**
- Detecta query param `?invite=token`
- Se presente: nao cria tenant novo, vincula ao tenant do convite

### Edge Function para Envio de Email

**`supabase/functions/send-invite-email/index.ts`**
- Recebe: email, token, tenant_name, inviter_name
- Envia email usando Lovable AI (ou Resend se configurado)
- Template com link de convite

### Hooks e Servicos

**`src/hooks/useTeamMembers.ts`**
- Busca membros do tenant atual
- Inclui profiles e roles

**`src/hooks/useInvitations.ts`**
- CRUD de convites
- Validacao de token
- Aceitacao de convite

### Detalhes Tecnicos

**Criacao do convite:**
```tsx
const createInvitation = async (email: string, role: 'member' = 'member') => {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
  
  const { data, error } = await supabase
    .from('invitations')
    .insert({
      tenant_id: profile?.tenant_id,
      email,
      role,
      token,
      invited_by: user?.id,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    });
    
  // Chamar edge function para enviar email
  await supabase.functions.invoke('send-invite-email', {
    body: { email, token, tenantName: tenant?.name }
  });
};
```

**Aceitacao do convite:**
```tsx
const acceptInvitation = async (token: string, userId: string) => {
  // 1. Buscar convite valido
  const { data: invitation } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();
    
  // 2. Atualizar profile com tenant_id
  await supabase
    .from('profiles')
    .update({ tenant_id: invitation.tenant_id })
    .eq('id', userId);
    
  // 3. Criar user_role
  await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      tenant_id: invitation.tenant_id,
      role: invitation.role,
    });
    
  // 4. Marcar convite como aceito
  await supabase
    .from('invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);
};
```

### Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/Settings.tsx` | Pagina de configuracoes completa |
| `src/pages/AcceptInvite.tsx` | Pagina de aceitacao de convite |
| `src/components/settings/TeamList.tsx` | Lista de membros da equipe |
| `src/components/settings/InviteDialog.tsx` | Modal de convite |
| `src/components/settings/PendingInvites.tsx` | Lista de convites pendentes |
| `src/hooks/useTeamMembers.ts` | Hook para gerenciar membros |
| `src/hooks/useInvitations.ts` | Hook para gerenciar convites |
| `supabase/functions/send-invite-email/index.ts` | Edge function de email |

### Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/App.tsx` | Adicionar rotas `/configuracoes` e `/convite/:token` |
| `src/pages/Register.tsx` | Suporte a query param de convite |
| `src/contexts/AuthContext.tsx` | Funcao `acceptInvite` |

### Migracao SQL

```sql
-- Enum para status do convite
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- Tabela de convites
CREATE TABLE public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role public.app_role NOT NULL DEFAULT 'member',
    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status public.invitation_status NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_invitations_tenant_id ON public.invitations(tenant_id);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_status ON public.invitations(status);

-- RLS Policies
-- Owners podem ver convites do seu tenant
CREATE POLICY "Owners can view invitations"
ON public.invitations FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner')
);

-- Owners podem criar convites
CREATE POLICY "Owners can create invitations"
ON public.invitations FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner')
);

-- Owners podem atualizar convites (revogar)
CREATE POLICY "Owners can update invitations"
ON public.invitations FOR UPDATE
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid()) 
  AND has_role(auth.uid(), 'owner')
);

-- Qualquer autenticado pode verificar token (para aceitar)
CREATE POLICY "Anyone can validate invitation token"
ON public.invitations FOR SELECT
TO authenticated
USING (email = auth.email() AND status = 'pending');
```

### Restricoes de Seguranca

1. Apenas **owners** podem convidar novos membros
2. Convites expiram em 7 dias
3. Token unico e nao adivinhavel (UUID)
4. Usuario so pode aceitar convite se email bater
5. Convite pode ser revogado antes de ser aceito
6. Nao permite convidar email ja existente no tenant

### Ordem de Implementacao

1. Migracao SQL (tabela invitations + policies)
2. Hooks (useTeamMembers, useInvitations)
3. Componentes de UI (TeamList, InviteDialog, PendingInvites)
4. Pagina Settings.tsx
5. Edge function de email
6. Pagina AcceptInvite.tsx
7. Modificar Register.tsx para suportar convites
8. Atualizar rotas em App.tsx

