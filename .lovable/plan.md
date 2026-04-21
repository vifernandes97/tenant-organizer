

# Melhorias UX/UI para o Cronograma

Análise da tela atual (`/cronogramas`) com foco em densidade visual, escaneabilidade e produtividade. Sugestões agrupadas por impacto.

---

## 🔥 Alto impacto

### 1. Stats clicáveis como filtros rápidos
Os 5 cards no topo (Total, Rascunhos, Aprovados, Agendados, Publicados) são informativos mas inertes. Transformar em **filtros toggle**:
- Click em "Rascunhos" → filtra calendário só por rascunhos (e destaca o card)
- Click novamente → remove filtro
- Adicionar barra colorida fina embaixo de cada card (cor do status) para reforçar identidade visual
- Substituir o card "Total" por **"Pendentes de aprovação"** (mais acionável)

### 2. Borda lateral colorida nos cards do calendário
Hoje o status só aparece como badge embaixo. Adicionar **borda esquerda 3px na cor do status** (igual fizemos no Brainstorm):
- Rascunho: cinza
- Aprovado: azul
- Agendado: âmbar
- Publicado: verde
- Permite escanear o status do mês inteiro só batendo o olho

### 3. Chips de filtros ativos visíveis
Hoje os filtros ficam escondidos dentro de Popovers com um número discreto. Mostrar **chips removíveis abaixo dos filtros** quando há algum ativo:
```
Filtros ativos: [Cliente: Acme ✕] [Status: Rascunho, Aprovado ✕] [Canal: Instagram ✕] [Limpar tudo]
```

### 4. Atalhos de período rápido
Botões pequenos ao lado da navegação de mês:
- **Hoje** (já existe, mas pouco visível — no botão central)
- **Esta semana** | **Próximos 7 dias** | **Próximos 30 dias**
- Reduz cliques para análises comuns

### 5. Indicador de overflow + densidade
Hoje o limite é 2 posts visíveis + "+N mais" em popover. Melhorias:
- Aumentar para **3 posts visíveis** (cards já estão compactos)
- **Indicador de carga** no canto do dia: pequeno dot colorido se o dia tem 5+ posts (visualizar dias "cheios")
- Cor do dia variando sutilmente conforme densidade (heatmap leve)

---

## ⚡ Médio impacto

### 6. Header da semana com data
Hoje só aparece "Dom Seg Ter Qua..." sem número. Em telas grandes, adicionar a data abaixo do dia da semana na visão Mês também (já existe na visão Semana). Fica mais fácil identificar o dia exato sem precisar olhar os números.

### 7. Toggle de exibição: "Sem fim de semana"
Para clientes B2B (LinkedIn, WordPress) que não postam aos finais de semana, toggle para **esconder Sáb/Dom** e ganhar espaço para posts da semana de trabalho. Persistir em `localStorage`.

### 8. Mini-preview no hover do card
Ao passar o mouse sobre um card, mostrar tooltip/popover com:
- Imagem maior (60x60)
- Cliente
- Horário agendado
- Primeiras 100 chars da legenda
- Reduz cliques desnecessários só para "ver o que é"

### 9. Indicador visual "agora" / "atrasado"
- Posts com `scheduled_at` no passado e status `scheduled` (não publicaram) → **borda vermelha pulsante** + ícone de alerta
- Hoje fica invisível que algo "ficou pra trás"

### 10. Empty state em dias vazios
Hoje dias sem posts aparecem em branco. Em **hover**, além do botão "+", mostrar texto sutil tipo *"Clique para criar"* — ajuda novos usuários.

### 11. Backlog colapsado mais informativo
Hoje o backlog colapsado mostra só ícone + número. Melhorias:
- Tooltip ao hover: "10 posts em backlog (3 rascunhos, 7 aprovados)"
- Badge muda de cor se há posts aprovados aguardando agendamento (call to action visual)

---

## ✨ Polimento

### 12. Mobile: lista por dia
Calendário mensal é inutilizável em mobile (<768px). Em mobile, trocar por:
- Lista vertical agrupada por dia
- Mostrar só os próximos 14 dias
- Botão "Carregar mais"

### 13. Skeleton loaders
Trocar `"Carregando..."` por skeleton grid imitando o calendário (7 colunas × 5 linhas com cards cinzas).

### 14. Atalhos de teclado
- `←` / `→` → navegar mês/semana
- `T` → ir para hoje
- `M` / `W` → alternar visão Mês/Semana
- `N` → novo post
- Mostrar tooltip com atalhos no hover dos botões

### 15. Header sticky ao rolar
Quando o usuário rola a página (cards de stats saem da tela), fixar a barra de navegação (mês + filtros) no topo para sempre poder mudar de período/filtrar sem rolar de volta.

---

## 📋 Detalhes técnicos (referência)

- **Stats clicáveis**: adicionar `onClick` que chama `setStatusFilter([status])`; visual ativo via `data-active` + classe condicional
- **Borda lateral por status**: criar mapa `STATUS_BORDER_CLASS` em `PostStatusBadge` ou novo arquivo, aplicar em `GroupedPostCard`
- **Chips ativos**: extrair em `<ActiveFilterChips />` recebendo arrays de filtros + handlers de remoção
- **Atalhos período**: novos handlers `setLast7Days`, `setNext30Days` ajustando `currentMonth`/`currentWeek`
- **Heatmap densidade**: classe condicional baseada em `dayGroups.length` (>=5 = `bg-primary/8`)
- **Mini-preview hover**: usar `HoverCard` do Radix (já instalado em `hover-card.tsx`)
- **Atrasado**: comparar `new Date(post.scheduled_at) < new Date() && post.status === 'scheduled'`
- **Mobile list**: novo componente `<ScheduleMobileList />` condicionado a `useIsMobile()`
- **Hotkeys**: `useEffect` + `keydown` listener (mesmo padrão do Brainstorm)

---

## 🎯 Roadmap sugerido

Recomendo começar pelos **4 itens de maior impacto visual e de produtividade**:
1. **Stats clicáveis como filtros** (#1)
2. **Borda lateral colorida nos cards** (#2)
3. **Chips de filtros ativos** (#3)
4. **Atalhos de período rápido** (#4)

Em uma segunda fase: posts atrasados (#9), mini-preview no hover (#8) e atalhos de teclado (#14).

Mobile (#12) e densidade/heatmap (#5) ficam para uma terceira fase.

**Me diga quais itens implementar** (por número, ex: "1, 2, 3 e 9") e eu preparo um plano detalhado de implementação para aprovação.

