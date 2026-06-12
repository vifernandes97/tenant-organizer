
# Sistema de Planos e Cobrança (Approvee)

Camada de **entitlements por tenant** acima do sistema atual de roles/permissions. Regra final: `permissão do usuário AND limite/feature do plano`. Nada do sistema atual de `has_permission` / `usePermissions` / sidebar gating muda.

Implementação em **3 etapas**, cada uma com aprovação separada antes de avançar.

---

## Etapa 1 — Banco de dados (schema + funções + triggers + seed)

### 1.1 Novos enums e tabelas

```sql
CREATE TYPE subscription_status AS ENUM
  ('trialing','active','past_due','canceled','locked');

CREATE TABLE public.plans (
  id uuid PK, code text UNIQUE, name text,
  price_cents int, currency text DEFAULT 'BRL',
  billing_period text DEFAULT 'monthly',
  max_active_clients int NULL,   -- null = ilimitado
  max_members int NULL,
  features jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  display_order int,
  created_at, updated_at
);

CREATE TABLE public.tenant_subscriptions (
  id uuid PK,
  tenant_id uuid UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES plans(id),
  status subscription_status NOT NULL,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_override boolean DEFAULT false,
  created_at, updated_at
);
```

Seed dos 3 planos:

| code | nome | preço | clients | members | features |
|---|---|---|---|---|---|
| starter | Starter | R$ 97 | 3 | 2 | `{api_access:false, white_label:false}` |
| agencia | Agência | R$ 197 | 10 | null | `{api_access:true, white_label:false}` |
| pro | Pro | R$ 397 | null | null | `{api_access:true, white_label:true}` |

Backfill: cada tenant existente recebe uma subscription `agencia` em `trialing` por 14 dias (não punir contas atuais).

### 1.2 RLS + GRANTs

- `plans`: `SELECT` para `authenticated` (tabela de preços). Sem escrita via client.
- `tenant_subscriptions`: `SELECT` para membros do tenant via `get_user_tenant_id(auth.uid())`. Escrita só por `service_role` (edge functions de billing).

### 1.3 Funções SECURITY DEFINER

- `get_tenant_subscription(tid)` → retorna `(plan_id, code, status_efetivo, features, max_active_clients, max_members, trial_ends_at, current_period_end)`.
  Regra do status efetivo:
  - `trialing` e `trial_ends_at > now()` → trialing
  - `active` → active
  - `past_due` e `current_period_end + 7 days > now()` → past_due (carência)
  - resto (trial expirado, past_due fora de carência, canceled, sem subscription) → **locked**
- `has_plan_feature(tid, feature text) returns boolean` — lê `features->>feature`; locked sempre `false`.
- `within_plan_limit(tid, resource text) returns boolean` — `resource` ∈ `('clients','members')`.
  - clients: `count(clients where tenant_id=tid AND status <> 'archived')` vs `max_active_clients`.
  - members: `count(distinct user_roles.user_id where tenant_id=tid) + count(invitations where tenant_id=tid AND status='pending')` vs `max_members`.
  - `null` = ilimitado → sempre true.
  - locked → sempre false.

### 1.4 Triggers de enforcement (BEFORE INSERT/UPDATE)

Cada trigger faz `RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='PLAN_LIMIT_CLIENTS'` etc. — o front lê `error.message` para identificar.

- `clients` BEFORE INSERT: bloqueia se exceder `max_active_clients` → `PLAN_LIMIT_CLIENTS`.
- `clients` BEFORE UPDATE: bloqueia se mudar `status` de `archived` → não-archived e estourar → `PLAN_LIMIT_CLIENTS`.
- `invitations` BEFORE INSERT (status pending): bloqueia se exceder `max_members` → `PLAN_LIMIT_MEMBERS`.
- `user_roles` BEFORE INSERT: idem (defesa em profundidade quando `accept_invitation` roda) → `PLAN_LIMIT_MEMBERS`.
- `tenant_api_tokens` BEFORE INSERT: bloqueia se `has_plan_feature(tid,'api_access')=false` → `PLAN_FEATURE_API`.
- **Modo locked**: trigger genérico em `clients`, `posts`, `post_images`, `post_comments`, `brainstorm_ideas`, `invitations`, `tenant_api_tokens` que bloqueia INSERT e UPDATE quando status efetivo = `locked` → `PLAN_LOCKED`. Leitura continua funcionando (não toca RLS de SELECT).
- **Sem deleção/arquivamento automático em downgrade** — só impede criação nova.

### 1.5 Ajustes em funções existentes

- `create_tenant_with_owner`: após criar tenant + owner + seed_default_roles, criar `tenant_subscriptions` em `trialing`, plano `agencia`, `trial_ends_at = now() + interval '14 days'`.
- Edge function `auto-publish`: filtrar `posts` por tenants cujo status efetivo ≠ `locked` (join com `get_tenant_subscription` ou exclusão via subquery).

---

## Etapa 2 — Stripe (após Etapa 1 aprovada)

Pré-requisito: habilitar a **integração Stripe nativa do Lovable** (`enable_stripe_payments`). Os 3 produtos/preços recorrentes mensais em BRL serão criados via `batch_create_product` depois que a integração estiver ativa. Os 3 price IDs ficam em secrets: `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_AGENCIA`, `STRIPE_PRICE_PRO`.

Edge functions (todas com CORS, validação JWT onde aplicável):

- `create-checkout` (auth, owner-only): body `{ plan_code }`. Cria/recupera `stripe_customer_id` no `tenant_subscriptions`, abre Checkout Session de assinatura recorrente. Retorna URL.
- `customer-portal` (auth, owner-only): abre o Stripe Customer Portal pré-autenticado com o customer do tenant. Retorna URL.
- `stripe-webhook` (sem JWT, valida `Stripe-Signature` com `STRIPE_WEBHOOK_SECRET`):
  - `checkout.session.completed` → grava `plan_id`, `status='active'`, IDs do Stripe, `current_period_end`.
  - `customer.subscription.updated` → atualiza `plan_id` (por price→plan_code), `current_period_end`, `status`.
  - `invoice.payment_failed` → `status='past_due'`.
  - `customer.subscription.deleted` → `status='canceled'`.
  - Toda escrita em `tenant_subscriptions` mora aqui (service role).

`plan_override = true` faz o webhook ignorar essa subscription (contas parceiras/internas).

---

## Etapa 3 — Frontend (após Etapa 2 aprovada)

### Hook `usePlan()`
React Query, key `['plan', tenant_id]`. Retorna:

```ts
{
  plan: { code, name, limits, features },
  status, isTrialing, trialDaysLeft, isLocked,
  usage: {
    clients: { used, limit },
    members: { used, limit }   // owner + members ativos + invites pending
  },
  canCreateClient, canInviteMember,
  hasFeature(name)
}
```

Invalida em mutações de clients/invitations/tokens e em foco de janela.

### Gates de UI

- `Clients.tsx` botão **Novo Cliente** disabled + tooltip + CTA "Fazer upgrade" quando `!canCreateClient`.
- `InviteDialog` / botão **Convidar** idem com `canInviteMember`.
- Aba **API & MCP** (`ApiTokensManager`): se `!hasFeature('api_access')`, mostra lock + CTA upgrade no lugar do form.
- `AppLayout`: badge no header com `Trial – X dias` quando `isTrialing`.
- Quando `isLocked`: banner fixo no topo + `ProtectedRoute` impede mutações (modo somente leitura), CTA para `/configuracoes?tab=billing`.

### Nova aba `Configurações → Plano e Cobrança` (owner-only)

- Plano atual, status, datas (trial/renovação).
- Barras de uso: clientes X / Y, membros X / Y.
- 3 cards de plano (lidos de `plans`) com botão que chama `create-checkout`.
- Botão **Gerenciar assinatura** → `customer-portal`.

### Tratamento de erros das mutations

Wrapper em `usePosts`/`useClients`/`useInvitations`/`useApiTokens`: se `error.message` começar com `PLAN_LIMIT_` ou `PLAN_FEATURE_` ou for `PLAN_LOCKED`, abrir `<UpgradeModal>` com mensagem contextual em vez de toast genérico.

---

## Critérios de aceite (validados no fim de cada etapa)

1. Starter com 3 clientes ativos não cria o 4º (testado via SQL direto também). Arquivar 1 libera.
2. Starter com owner + 1 membro não envia novo convite; cancelar pendente libera vaga.
3. Starter não cria token de API; após upgrade para agência, cria.
4. Webhook do Stripe ativa/rebaixa/cancela e o app reflete sem logout (invalidate query).
5. Trial expirado: app em modo somente leitura, cron `auto-publish` ignora o tenant.
6. Downgrade Pro → Starter com 8 clientes ativos: dados intactos, criação bloqueada, banner orienta arquivar.
7. `has_permission`, `usePermissions`, sidebar gating: comportamento inalterado.

---

## Confirmações antes de começar

1. **OK começar pela Etapa 1** (migration de schema + seed + triggers + ajuste em `create_tenant_with_owner` + backfill de trial de 14d para tenants existentes)?
2. Backfill: confirma `agencia` em trial de 14 dias para todos os tenants atuais? (alternativa: `pro` com `plan_override=true` para você não ser bloqueado durante o desenvolvimento — recomendo essa para a sua conta especificamente).
3. Etapa 2 vai usar a **integração Stripe nativa do Lovable** (sem BYOK). Confirma?
