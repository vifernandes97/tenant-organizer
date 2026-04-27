# Gerenciamento de Status por Cliente e Canal em Configurações

## Objetivo
Criar uma seção dedicada em **Configurações** onde o owner gerencie os status de post **por cliente e por canal social** (Instagram Feed, Stories, Reels, TikTok, LinkedIn, Facebook, Twitter, YouTube, WordPress), substituindo o modelo atual onde os status são definidos apenas dentro do cadastro do cliente e compartilhados entre todos os canais.

## Mudanças no banco de dados

Adicionar coluna `channel` em `client_post_statuses`:

- `channel social_channel NOT NULL DEFAULT 'instagram_feed'`
- Trocar a chave única implícita: status passam a ser únicos por **(client_id, channel, slug)**
- Migrar registros existentes: como o usuário ainda não usa o sistema em produção com este escopo, todos os status atuais serão duplicados como sendo do canal `instagram_feed` (assumindo o canal mais comum) **OU** serão replicados para todos os canais ativos do cliente. **Decisão recomendada: replicar para todos os canais ativos do cliente** para preservar o comportamento atual de "um conjunto vale para tudo".

RLS: as políticas existentes (owner ou client_access) continuam válidas — apenas adiciona-se a nova coluna.

## Mudanças no frontend

### 1. Nova aba "Status de Posts" em `Settings.tsx` (apenas owner)
Layout em 3 colunas (responsivo):

```text
┌─────────────────────────────────────────────────────┐
│  Cliente: [▼ Selecionar cliente]                    │
├──────────────┬──────────────────────────────────────┤
│ Canais       │ Status do canal selecionado          │
│ ▸ Instagram  │  ┌─ Rascunho        🎨 [×]          │
│   Feed ✓     │  ├─ Aprovado        🎨 [×]          │
│ ▸ Stories    │  ├─ Agendado        🎨 [×] ☑ Final  │
│ ▸ LinkedIn   │  └─ Publicado       🎨 [×] ☑ Final  │
│ ▸ WordPress  │  [+ Adicionar status]                │
│ ▸ ...        │  [Carregar padrão] [Copiar de canal]│
└──────────────┴──────────────────────────────────────┘
```

- **Seletor de cliente** no topo (combobox).
- **Lista lateral de canais** mostrando apenas os canais habilitados no cliente, com badge indicando quantos status estão configurados (ou "padrão do sistema" quando vazio).
- **Painel direito** com a configuração reutilizando `ClientStatusConfig` adaptado para receber `channel`.
- **Botão "Copiar de outro canel"** abre menu para clonar status de outro canal do mesmo cliente (acelera setup).
- **Botão "Carregar padrão"** carrega:
  - Para `wordpress`: Rascunho, Gerado por IA, Revisado, Aprovado, Publicado
  - Para os demais: Rascunho, Aprovado, Agendado, Publicado

### 2. Hooks (`useClientPostStatuses.ts`)
- Adicionar parâmetro `channel?: SocialChannel` em `useClientPostStatuses`, `useBulkUpsertClientPostStatuses` e demais mutations.
- Query key passa a ser `['client-post-statuses', clientId, channel]`.
- Bulk upsert filtra delete por `client_id + channel` (não apaga status de outros canais).

### 3. Consumidores existentes (sem mudança de comportamento visível)
Atualizar para passar `channel` ao consultar status:
- `PostStatusDropdown` — já recebe `channel`, basta repassar para o hook.
- `PostStatusBadge`, `ScheduleFilters`, `ScheduleListView`, `GroupedPostCard`, `PostCard`, `PostDetails`, `GroupPostDetails` — passar o `channel` do post correspondente.

### 4. Cadastro de cliente (`ClientForm.tsx`)
Remover o bloco atual de configuração de status (que era global por cliente) e adicionar um aviso: *"Os status são configurados por canal em Configurações → Status de Posts."* com link direto para a nova seção. Isso evita duplicidade de UI e centraliza o gerenciamento.

## Detalhes técnicos

**Arquivos editados:**
- `supabase/migrations/<timestamp>_add_channel_to_client_post_statuses.sql` — adiciona coluna, índice único composto e migra dados existentes
- `src/pages/Settings.tsx` — adiciona aba "Status de Posts"
- `src/components/settings/ChannelStatusManager.tsx` — **novo**: componente principal da aba (seletor cliente + lista canais + painel)
- `src/components/settings/ChannelStatusEditor.tsx` — **novo**: painel direito (wraps `ClientStatusConfig` com save/load por canal)
- `src/hooks/useClientPostStatuses.ts` — adiciona parâmetro `channel`
- `src/components/clients/ClientForm.tsx` — remove configuração inline, adiciona aviso/link
- `src/components/schedule/PostStatusDropdown.tsx` — passa `channel` ao hook
- `src/components/schedule/PostStatusBadge.tsx`, `ScheduleFilters.tsx`, `ScheduleListView.tsx`, `GroupedPostCard.tsx`, `PostCard.tsx`, `PostDetails.tsx`, `GroupPostDetails.tsx` — passar `channel`

**Tipos:** após a migration, `src/integrations/supabase/types.ts` é regenerado automaticamente e expõe `channel` em `ClientPostStatus`.

## Comportamento e regras
- **Owner-only**: apenas owners veem e podem editar a aba (mesma regra das outras configurações sensíveis).
- **Fallback**: se um canal não tem status configurados para um cliente, o sistema continua usando os status default por canal (WordPress vs. Default).
- **Compatibilidade**: posts existentes com `custom_status_id` continuam funcionando — o `id` do status não muda na migration, apenas ganha um `channel`.
- **Sem alteração** em RLS, edge functions, n8n/WordPress webhook ou auto-publish.

## Fora do escopo
- Status globais do tenant (não atrelados a cliente).
- Reordenação por drag-and-drop multi-canal (mantém o atual por canal).
- Aplicação em massa "este conjunto para todos os clientes" (pode virar uma feature posterior).
