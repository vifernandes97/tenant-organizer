## Objetivo

Quando uma ideia do Brainstorm é enviada para o backlog (vira post), ela deve sair do quadro/lista principal mas continuar acessível em uma visão de "Arquivadas" para manter histórico.

## Mudanças

### 1. Banco — novo status "arquivada"
- Adicionar valor `'arquivada'` ao enum `brainstorm_idea_status` (migration `ALTER TYPE ... ADD VALUE`).
- Nenhuma mudança em RLS necessária.

### 2. Hook `useBrainstormIdeas`
- Incluir `'arquivada'` no tipo `BrainstormIdeaStatus`.

### 3. Página `Brainstorm.tsx`
- No `handleSendToBacklog`, ao invés de marcar como `dar_sequencia`, marcar como `arquivada`.
- Por padrão **ocultar** ideias arquivadas das visões principais (grid e kanban).
- Adicionar um chip extra "Arquivadas" ao lado de "Todas / Nova / Dar sequência / Reformular / Abandonar":
  - Quando selecionado, mostra apenas as arquivadas.
  - Caso contrário, arquivadas ficam fora de todas as outras contagens e listas.
- Card da ideia arquivada: ação extra "Restaurar" (volta para `nova`) além de editar/excluir. Ocultar a ação "Enviar para backlog" quando já arquivada.

### 4. Kanban
- Manter as 4 colunas atuais (`nova`, `dar_sequencia`, `reformular`, `abandonar`).
- Arquivadas não aparecem no kanban — só na visão grid com o filtro "Arquivadas" ativo.

### 5. `BrainstormCard` / `STATUS_CONFIG`
- Adicionar config visual (label "Arquivada", cor neutra/cinza, ícone) para o novo status, usado nos chips e badges.

## Detalhes técnicos

- Migration:
  ```sql
  ALTER TYPE brainstorm_idea_status ADD VALUE IF NOT EXISTS 'arquivada';
  ```
- Tipos do Supabase (`types.ts`) regeneram automaticamente após a migration.
- A criação do post no backlog continua igual (`createPost` + `is_backlog: true`); só muda o status final aplicado à ideia.
- Filtro padrão (`statusFilter === 'all'`) passa a significar "todas exceto arquivadas". Apenas o chip "Arquivadas" lista as arquivadas.

## Resultado para o usuário

- Enviou para backlog → a ideia some do quadro.
- Continua encontrável em Brainstorm → filtro "Arquivadas".
- Pode restaurar a ideia se precisar trazê-la de volta ao fluxo.
