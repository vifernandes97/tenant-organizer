

# Melhorias visuais no modal de post — Legenda em destaque

## Problema
No modal `GroupPostDetails`, a legenda — segundo campo mais importante depois das imagens — fica no fim do painel direito (depois de Título, Cliente, Data, Status), com altura padrão pequena, exigindo clicar em "Expandir" toda vez para ler decentemente.

## Solução
Reorganizar a aba **Detalhes** para colocar a legenda logo no topo (após Título) e dar a ela uma altura mínima maior, ocupando o espaço que naturalmente sobra no painel. Os metadados (Cliente, Data, Status) ficam abaixo, num bloco mais compacto.

## Mudanças

### 1. Reordenar campos em `src/components/schedule/GroupPostDetails.tsx` (aba Detalhes)
Nova ordem dentro de `<TabsContent value="details">`:

1. **Título** (mantém)
2. **Legenda** ⬅ promovida para o topo, com `min-h-[280px]` no editor
3. Separator
4. **Metadados em grid 2 colunas** (mais compacto):
   - Cliente | Data e Hora
   - Canal (se single-channel) | Status
5. Separator
6. **Bloco WordPress** (quando `isWordPress`) — mantém posição atual mas vai pra baixo dos metadados

### 2. Aumentar altura do editor da legenda
No componente `InlineRichTextEditor` chamado em ~linha 620, passar uma `minHeight` maior (ou wrapper com `min-h-[280px]`) para que o campo já apareça grande sem precisar expandir. O botão "Expandir" para fullscreen continua disponível.

### 3. Refinos visuais menores
- Reduzir margens entre metadados (de `mb-4` para `mb-3`) já que ficarão em grid lado a lado
- Manter o botão "Expandir" da legenda — útil para legendas muito longas
- WordPress continua com seu fluxo próprio (o campo "Texto do Artigo" já tem altura grande)

## Layout resultante (painel direito)

```text
┌────────────────────────────────┐
│ Status ▼          Cliente nome │  ← header (sem mudança)
├────────────────────────────────┤
│ [Detalhes] [Comentários]       │
├────────────────────────────────┤
│ Título                         │
│ ┌────────────────────────────┐ │
│                                │
│ Legenda            [Expandir↗] │
│ ┌────────────────────────────┐ │
│ │                            │ │
│ │   editor grande (280px)    │ │
│ │                            │ │
│ └────────────────────────────┘ │
│ ─────────────────────────────  │
│ Cliente        │ Data e Hora   │
│ Canal          │ Status        │
└────────────────────────────────┘
```

## Arquivo editado
- `src/components/schedule/GroupPostDetails.tsx` — reordenação JSX da aba Detalhes (~linhas 454-648) e ajuste de altura da legenda

## Notas
- Sem mudanças em hooks, schema, validações ou em `InlineRichTextEditor` em si (apenas o wrapper recebe `min-h`)
- Comportamento de salvar inline preservado
- Dialog de "Expandir" (fullscreen da legenda) mantido sem alteração
- Multi-canal: avisos "(apenas {canal})" e "(todos os canais)" preservados nos respectivos campos

