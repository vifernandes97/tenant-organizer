

# Backlog de publicações sem data

## Visão geral
Permitir que posts sejam criados sem data de agendamento (backlog). No calendário, exibir um painel lateral com posts em backlog que podem ser arrastados para um dia ou ter data atribuída manualmente.

## Banco de dados

**Migração**: tornar `scheduled_at` nullable na tabela `posts`.
```sql
ALTER TABLE public.posts ALTER COLUMN scheduled_at DROP NOT NULL;
```

## Frontend

### 1. `src/hooks/usePosts.ts`
- Atualizar schemas Zod: `scheduled_at` passa a ser opcional (string vazia ou ausente = backlog)
- Na mutation `useCreatePost`, enviar `scheduled_at: null` quando vazio
- Novo hook/query `useBacklogPosts`: busca posts onde `scheduled_at IS NULL`, com mesmos filtros de client/status/channel
- Atualizar `useUpdatePost` para aceitar `scheduled_at: null`

### 2. `src/components/schedule/PostForm.tsx`
- Tornar campo "Data e Hora" opcional
- Adicionar checkbox/toggle "Sem data (Backlog)" que limpa o campo de data
- Quando marcado, `scheduled_at` é enviado como null

### 3. Novo componente `src/components/schedule/BacklogPanel.tsx`
- Painel lateral (ou seção colapsável) exibindo posts sem data
- Cards dos posts em backlog com suporte a drag (draggable)
- Ao clicar em um post do backlog, abre o `GroupPostDetails` normalmente
- Filtrado pelo mesmo `clientFilter` da página

### 4. `src/pages/Schedule.tsx`
- Adicionar query para buscar posts em backlog
- Renderizar `BacklogPanel` ao lado do calendário (layout flex: backlog + calendário)
- Quando um post do backlog é "dropado" no calendário, chamar `useUpdatePost` com a nova data
- Adicionar contagem de backlog nos stats

### 5. `src/components/schedule/ScheduleCalendar.tsx` e `ScheduleWeekView.tsx`
- Aceitar drops de posts vindos do backlog panel (já suportam drag & drop, só precisa tratar o caso de posts sem `scheduled_at`)

### 6. `src/hooks/useGroupedPosts.ts`
- Tratar posts com `scheduled_at: null` — agrupar separadamente para o backlog

## Fluxo
1. Usuário cria post → pode deixar sem data → vai para o backlog
2. No calendário, painel lateral mostra posts em backlog
3. Usuário arrasta post do backlog para um dia → post recebe `scheduled_at`
4. Ou clica no post do backlog → edita e define data manualmente

