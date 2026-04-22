

# Visualização do cronograma em modo Lista

## Comportamento
Adicionar um terceiro modo de visualização (além de **Mês** e **Semana**) chamado **Lista**, que mostra todos os posts do período em formato denso e cronológico — ideal para revisar muitos posts rápido sem perder informação.

## UI

### Toggle de visualização
Em `src/pages/Schedule.tsx`, adicionar `"list"` ao `ToggleGroup` existente:
```text
[ Semana ] [ Mês ] [ Lista ]
```

### Layout da Lista
Posts agrupados por dia, ordem cronológica ascendente. Cada dia tem um cabeçalho sticky e abaixo as linhas dos posts.

```text
┌─ Segunda, 22 de abril ──────────────────────────────────┐
│ ⏰ 09:00  [img] Título do post   Cliente  IG FB ●Aprovado  💬2 │
│ ⏰ 14:30  [img] Outro post       Cliente  LI    ●Rascunho      │
├─ Terça, 23 de abril ────────────────────────────────────┤
│ ⏰ 10:00  [img] Post da terça    Cliente  IG    ●Agendado      │
└─────────────────────────────────────────────────────────┘
```

Colunas por linha (agrupadas por `groupId`, igual às outras views):
- Thumbnail 40x40 (imagem ou ícone do tipo de mídia)
- Horário (HH:mm) ou "Sem hora"
- Título (truncado)
- Cliente
- Badges de canais (compactos)
- `PostStatusBadge`
- Indicador "+N posts" se for grupo com múltiplos canais

Linha inteira clicável → abre `GroupPostDetails` (mesmo handler `onPostClick`).
HoverCard com `PostHoverPreview` (já existente) também na linha.

### Período exibido
- Usa o mesmo `currentMonth` da navegação
- Botões `< >` avançam/retrocedem 1 mês
- Empty state: "Nenhum post agendado neste período"

## Implementação

### 1. Novo componente `src/components/schedule/ScheduleListView.tsx`
- Props: `{ month: Date; posts: PostWithImages[]; onPostClick: (group: PostGroup) => void }`
- Reusa `groupPosts()` de `useGroupedPosts.ts`
- Agrupa groups por data (chave `yyyy-MM-dd`), ordena dias e horários ascendente
- Header sticky por dia (`sticky top-0 bg-background z-10 border-b`) com data em pt-BR e contagem
- Sem drag-and-drop nesta view (foco em leitura)

### 2. `src/pages/Schedule.tsx`
- Estender `ViewMode` para `'month' | 'week' | 'list'`
- Adicionar `<ToggleGroupItem value="list">Lista</ToggleGroupItem>`
- Renderização condicional: se `viewMode === 'list'` → `<ScheduleListView ... />`
- `dateLabel` em modo lista usa o nome do mês (mesma lógica do mês)
- BacklogPanel à esquerda continua aparecendo nas três views

## Notas técnicas
- Reusa `PostHoverPreview`, `PostStatusBadge`, `ChannelBadges`, `extractPlainText` — zero novas dependências
- Sem mudanças em hooks de dados, schema ou validação
- Filtros (cliente/status/canal) já se aplicam via `usePosts({ ... })` no parent — funciona automaticamente

## Arquivos editados/criados
- **Criado**: `src/components/schedule/ScheduleListView.tsx`
- **Editado**: `src/pages/Schedule.tsx`

