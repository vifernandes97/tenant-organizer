

# Arrastar posts do calendário para o backlog

## Resumo
Permitir que posts já agendados no calendário sejam arrastados de volta para o painel de backlog, removendo a data de agendamento (`scheduled_at = null`).

## Mudanças

### 1. `src/components/schedule/BacklogPanel.tsx`
- Adicionar suporte a `onDragOver`, `onDragEnter`, `onDragLeave` e `onDrop` no container do painel
- Ao receber um drop, chamar callback `onUnschedule` com os IDs dos posts
- Feedback visual (highlight) quando um item está sendo arrastado sobre o painel

### 2. `src/pages/Schedule.tsx`
- Passar novo prop `onUnschedule` ao `BacklogPanel`
- No handler, chamar `supabase.from('posts').update({ scheduled_at: null })` para cada post do grupo
- Invalidar queries de posts e backlog após a operação

