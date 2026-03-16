

# Fix: Status inconsistente entre calendar card e modal

## Problema
O `GroupedPostCard` (e `PostCard`) usa `PostStatusBadge`, que só conhece os status padrão do sistema (draft → "Rascunho", etc.). Já o modal usa `PostStatusDropdown`, que consulta os **custom statuses** do cliente via `useClientPostStatuses`. Quando um cliente tem status customizados, o modal mostra o status correto mas o card no calendário mostra o status do sistema.

## Solução
Atualizar `PostStatusBadge` para aceitar opcionalmente `customStatusId` e `clientId`, e quando existirem status customizados, exibir o badge com nome/cor do status customizado em vez do status do sistema.

## Mudanças

### 1. `src/components/schedule/PostStatusBadge.tsx`
- Adicionar props opcionais `customStatusId` e `clientId`
- Quando `clientId` fornecido, usar `useClientPostStatuses(clientId)` para buscar status customizados
- Se existirem custom statuses e houver `customStatusId`, exibir badge com nome/cor do status customizado
- Se existirem custom statuses sem `customStatusId`, usar o primeiro status customizado (mesmo fallback que o `PostStatusDropdown`)
- Manter fallback para status do sistema quando não há custom statuses

### 2. `src/components/schedule/GroupedPostCard.tsx`
- Passar `customStatusId={primaryPost.custom_status_id}` e `clientId={group.clientId}` para `PostStatusBadge`

### 3. `src/components/schedule/PostCard.tsx`
- Passar `customStatusId={post.custom_status_id}` e `clientId={post.client_id}` para `PostStatusBadge`

