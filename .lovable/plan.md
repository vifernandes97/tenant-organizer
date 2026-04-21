

# Melhorias visuais no calendário: drop zone e thumbnails

## 1. Drop zone mais forte ao arrastar

Hoje o feedback visual ao arrastar um card sobre um dia é discreto (`border-primary bg-primary/10`). Vamos reforçar com:

- **Highlight teal mais intenso** na célula do dia: borda primary mais grossa (ring-2), background `bg-primary/15`, e um overlay sutil
- **Animação de pulso** (`animate-pulse`) aplicada ao container do dia enquanto o item está sobre ele
- **Escala leve** (`scale-[1.02]`) para dar profundidade
- **Aplicar o mesmo padrão** no `BacklogPanel` (área de drop para desagendar) para consistência

Arquivos afetados:
- `src/components/schedule/ScheduleCalendar.tsx` — refinar classes do `isDragOver`
- `src/components/schedule/ScheduleWeekView.tsx` — aplicar mesmo highlight (visão semanal)
- `src/components/schedule/BacklogPanel.tsx` — reforçar `isDragOver` da panel

## 2. Mini-thumbnail da imagem no card do calendário

Hoje `GroupedPostCard` mostra apenas ícones de canal + título + status. Vamos adicionar uma miniatura quando houver imagem:

- Adicionar miniatura quadrada (28x28px) à esquerda do card, exibindo `group.firstImage` (já disponível em `PostGroup`)
- Quando o post tiver vídeo/PDF e nenhuma imagem, exibir um placeholder com ícone do tipo de mídia
- Quando não houver mídia alguma, manter o layout atual (sem thumbnail) para não desperdiçar espaço
- Usar `object-cover` + `rounded` + borda sutil
- Aplicar lazy-loading (`loading="lazy"`) nas thumbnails

Layout final do card:
```text
┌──────────────────────────────────┐
│ [img] [icons] Título do post...  │
│        Status badge      💬 2    │
└──────────────────────────────────┘
```

Arquivos afetados:
- `src/components/schedule/GroupedPostCard.tsx` — adicionar bloco de thumbnail condicional
- `src/components/schedule/BacklogPanel.tsx` — aplicar mesma thumbnail no `BacklogCard` para consistência

## Notas técnicas

- A URL da primeira imagem já vem agregada em `PostGroup.firstImage` (`useGroupedPosts.ts`), não há mudança no hook
- Para detectar mídia não-imagem, verificar `primaryPost.post_images?.[0]?.media_type` (vídeo/pdf) — exibir ícone correspondente do `lucide-react` (`Video`, `FileText`)
- Sem mudanças no backend nem no schema

