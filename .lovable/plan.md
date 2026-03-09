

# Configuração de status do post por cliente

## Banco de dados

### Nova tabela `client_post_statuses`
- `id` (uuid, PK)
- `client_id` (uuid, FK clients)
- `tenant_id` (uuid, FK tenants)
- `name` (text) — nome exibido (ex: "Em revisão")
- `slug` (text) — identificador interno (ex: "em_revisao")
- `color` (text) — cor hex (ex: "#f59e0b")
- `icon` (text) — nome do ícone Lucide (ex: "eye", "check")
- `display_order` (integer) — ordem de exibição
- `is_final` (boolean, default false) — indica se é status final (equivalente a "publicado")
- `created_at` (timestamptz)

RLS: mesmas regras de `clients` (tenant isolation + client access).

### Migração da coluna `posts.status`
- Adicionar coluna `custom_status_id` (uuid, nullable, FK para `client_post_statuses`) na tabela `posts`
- Manter `status` (enum) existente para retrocompatibilidade
- Quando o cliente tem status customizados, usar `custom_status_id`; caso contrário, usar o enum `status` existente

### Seed de status padrão
- Ao criar um cliente, inserir automaticamente os status padrão: Rascunho, Aprovado, Agendado, Publicado (via lógica no frontend ao salvar)

## Frontend

### 1. Hook `src/hooks/useClientPostStatuses.ts`
- CRUD para status customizados do cliente
- Query por `client_id`
- Mutations: criar, atualizar, reordenar, deletar

### 2. Seção no formulário do cliente (`ClientForm.tsx`)
- Nova aba "Status" (ou seção dentro de aba existente)
- Lista ordenável dos status com nome, cor (color picker), e ícone
- Botão para adicionar novo status
- Opção de deletar (exceto se houver posts usando aquele status)

### 3. Atualizar `PostStatusDropdown`
- Receber `clientId` como prop
- Buscar status customizados do cliente
- Se o cliente tem status customizados, exibir esses; senão, fallback para os status padrão (comportamento atual)
- Renderizar badges com cores dinâmicas

### 4. Atualizar `PostDetails` e `GroupPostDetails`
- Passar `clientId` para o `PostStatusDropdown`

### 5. Atualizar `ScheduleFilters`
- Quando um cliente está selecionado, mostrar os status daquele cliente no filtro

## Fluxo
1. Owner cria/edita cliente → configura os status na aba "Status"
2. Ao criar posts para esse cliente, o dropdown mostra os status customizados
3. Se nenhum status customizado, mantém comportamento atual com os status fixos

