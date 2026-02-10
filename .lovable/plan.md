

## Drag and Drop para Alterar Datas no Calendário

### Objetivo

Permitir arrastar cards de postagens entre dias do calendário (mensal e semanal) para alterar a data agendada. Ao soltar o card em outro dia, a data de todos os posts do grupo será atualizada automaticamente.

### Abordagem

Utilizar a HTML5 Drag and Drop API nativa do navegador (sem dependências externas), mantendo o projeto leve.

### Comportamento

1. Usuário clica e arrasta um card de postagem
2. Ao arrastar sobre outro dia, a célula do dia recebe destaque visual (borda/fundo)
3. Ao soltar, a data `scheduled_at` de todos os posts do grupo é atualizada (mantendo o horário original, apenas alterando o dia)
4. Feedback visual: toast de sucesso e atualização instantânea via invalidação do cache

### Alterações Necessárias

#### 1. Novo hook `useRescheduleGroup` em `usePosts.ts`

Mutation dedicada que atualiza `scheduled_at` de todos os posts de um grupo de uma só vez, preservando o horário original:

```typescript
export function useRescheduleGroup() {
  // Recebe: groupId, posts[], newDate
  // Para cada post do grupo: atualiza scheduled_at mantendo hora/minuto
  // Sem regenerar título (não muda caption)
  // Toast: "Post reagendado para DD/MM"
}
```

#### 2. Atualizar `GroupedPostCard.tsx`

Tornar o card draggable:
- Adicionar `draggable` e handlers `onDragStart`/`onDragEnd`
- No `onDragStart`, serializar dados do grupo no `dataTransfer`
- Feedback visual: opacidade reduzida durante arrasto

#### 3. Atualizar `ScheduleCalendar.tsx`

Tornar as células dos dias drop targets:
- Adicionar handlers `onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop`
- Highlight visual na célula ao arrastar sobre ela
- No `onDrop`, extrair dados do grupo e chamar `useRescheduleGroup`
- Receber `onReschedule` callback via props

#### 4. Atualizar `ScheduleWeekView.tsx`

Mesma lógica de drop target aplicada à visão semanal.

#### 5. Atualizar `Schedule.tsx`

- Instanciar `useRescheduleGroup`
- Passar callback `onReschedule` para ambos os calendários

### Resumo dos Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/usePosts.ts` | Adicionar hook `useRescheduleGroup` |
| `src/components/schedule/GroupedPostCard.tsx` | Tornar draggable com dados do grupo |
| `src/components/schedule/ScheduleCalendar.tsx` | Adicionar drop zones nas células + prop `onReschedule` |
| `src/components/schedule/ScheduleWeekView.tsx` | Adicionar drop zones nas células + prop `onReschedule` |
| `src/pages/Schedule.tsx` | Conectar mutation aos calendários |

### Detalhes Visuais

| Estado | Feedback |
|--------|----------|
| Arrastando | Card com opacidade 50%, cursor `grabbing` |
| Sobre célula válida | Borda `primary` + fundo `primary/10` |
| Sucesso | Toast "Post reagendado para [data]" |
| Erro | Toast de erro |

