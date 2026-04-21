

# Melhorias de UX/UI para o Brainstorm

## Estado atual
A página funciona bem mas tem oportunidades claras: filtros sem contagem, cards "soltos" sem agrupamento visual por status, sem busca, sem ordenação, e ações escondidas no menu de 3 pontos.

---

## Melhorias propostas

### 1. Filtros de status com contagem + visual ativo melhor
- Cada chip de filtro mostra contagem entre parênteses: **"Nova (4)"**, **"Dar sequência (7)"**
- Chip ativo ganha cor temática do status (verde, amarelo, vermelho), não só `default`
- Adicionar **indicador de ponto colorido** antes do label (ex: 🟢 Dar sequência)

### 2. Busca rápida por título/descrição
- Campo de busca com ícone de lupa ao lado dos filtros
- Filtra em tempo real (debounce 200ms)
- Botão X para limpar

### 3. Modo Kanban (toggle Grid ↔ Kanban)
- Toggle no topo entre **"Grade"** (atual) e **"Kanban"** (novo)
- Modo Kanban: 4 colunas (Nova, Dar sequência, Reformular, Abandonar) com drag-and-drop entre colunas para mudar status
- Persistir preferência em `localStorage`
- Usa o mesmo padrão de drag-and-drop já presente no Schedule

### 4. Cards mais ricos e escaneáveis
- **Borda lateral colorida** indicando status (4px à esquerda, cor por status)
- **Data relativa** discreta no rodapé do card ("há 2 dias", usando date-fns `formatDistanceToNow` em pt-BR)
- **Truncar descrição** em 3 linhas com `line-clamp-3` (hoje pode ficar enorme)
- **Hover state** mais claro: shadow + leve translateY
- Click no card abre o modal de edição (não só pelo menu)

### 5. Ações principais visíveis (não só no menu)
No hover, mostrar barra inferior com 2 botões pequenos:
- **"Enviar para backlog"** (ícone Send) — ação principal, fica visível
- **"Editar"** (ícone Pencil)
- Menu de 3 pontos mantém apenas: Mudar status, Excluir

### 6. Empty states acionáveis
- Quando não há ideias: ilustração leve (ícone Lightbulb grande) + título + **CTA "Criar primeira ideia"** (não só texto)
- Quando filtro não retorna nada: mensagem específica + botão "Limpar filtros"

### 7. Ordenação
- Dropdown "Ordenar por": Mais recentes (padrão), Mais antigas, A-Z, Status
- Persistir em localStorage

### 8. Modal "Nova ideia" — quick-add inline opcional
- Manter o Dialog atual para edição completa
- Adicionar **input rápido no topo** ("+ Adicionar ideia rápida...") que cria com só o título ao pressionar Enter — fluxo estilo Trello/Linear para captura rápida

### 9. Atalhos de teclado
- `N` para nova ideia
- `/` para focar busca
- `Esc` para fechar modais (já funciona)

---

## Arquivos afetados
- `src/pages/Brainstorm.tsx` — refatoração principal (filtros com contagem, busca, toggle de view, ordenação, quick-add, hotkeys)
- **Novo** `src/components/brainstorm/BrainstormCard.tsx` — extrair card para componente reutilizável (usado em grid e kanban)
- **Novo** `src/components/brainstorm/BrainstormKanban.tsx` — visão kanban com drag-and-drop
- **Novo** `src/components/ui/empty-state.tsx` — componente reutilizável (será aproveitado em outras telas depois)
- `src/hooks/useBrainstormIdeas.ts` — sem mudanças (statuses já existem)

## Notas técnicas
- Drag-and-drop no Kanban: usar HTML5 nativo (mesmo padrão de `BacklogPanel` / `ScheduleCalendar`), sem nova dependência
- Hotkeys: implementar com `useEffect` + `keydown` listener simples, sem nova lib
- `line-clamp-3` já disponível via Tailwind plugin padrão
- Cores de status: usar classes do `STATUS_CONFIG` existente, derivar borda da mesma paleta

## Sugestão de roadmap
Recomendo implementar tudo em uma leva, pois as mudanças são coesas e se reforçam. Se quiser dividir, sugiro:
- **Fase 1**: Itens 1, 2, 4, 5, 6 (refinamento visual + busca) — impacto imediato
- **Fase 2**: Itens 3, 7, 8, 9 (Kanban, ordenação, quick-add, atalhos) — recursos avançados

