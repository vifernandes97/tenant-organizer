

# Hover preview nos cards de post do cronograma

## Comportamento
Ao passar o mouse sobre um card de post no calendário (`PostCard` ou `GroupedPostCard`), abrir um **HoverCard** lateral mostrando uma prévia rica:
- Imagem/mídia em tamanho maior (ou ícone se for vídeo/PDF)
- Título completo (sem truncar)
- Cliente
- Canais (badges com nome)
- Status
- Horário agendado (ou "Backlog")
- Trecho da legenda (primeiras ~150 chars em texto plano)
- Contagem de comentários abertos (se houver)
- No caso de grupo: lista de canais e quantidade de posts

O clique continua abrindo o modal de detalhes — o hover é puramente informativo.

## Implementação

### 1. Novo componente `src/components/schedule/PostHoverPreview.tsx`
Conteúdo reutilizável renderizado dentro de um `HoverCardContent`:
- Props: `{ title, caption, image, mediaType, channels, status, customStatusId, clientId, clientName, scheduledAt, openComments, postsCount? }`
- Layout: ~320px de largura, imagem no topo (aspect 16:9, `object-cover`) ou placeholder com ícone, depois bloco de metadados
- Usa `ChannelBadges` (sem `iconOnly`) para mostrar nomes dos canais
- Usa `PostStatusBadge` para o status
- Formata `scheduledAt` com `date-fns` (já presente no projeto)
- Trecho da legenda via `extractPlainText(caption).substring(0, 150)`

### 2. `src/components/schedule/PostCard.tsx`
Envolver o `<div>` principal em `<HoverCard openDelay={300} closeDelay={100}>`:
```tsx
<HoverCard openDelay={300} closeDelay={100}>
  <HoverCardTrigger asChild>
    <div onClick={onClick} className="...">...</div>
  </HoverCardTrigger>
  <HoverCardContent side="right" align="start" className="w-80 p-0">
    <PostHoverPreview ... />
  </HoverCardContent>
</HoverCard>
```

### 3. `src/components/schedule/GroupedPostCard.tsx`
Mesma estrutura. Importante: o `draggable` deve continuar no `<div>` interno (trigger), não no HoverCard wrapper. Adicionar `postsCount={posts.length}` e lista completa de canais.

### Detalhes UX
- `openDelay={300}` evita abrir ao só atravessar o card — só quando o usuário pausa
- `closeDelay={100}` para não fechar bruscamente
- `side="right"` por padrão (Radix faz collision detection automático e flipa pra esquerda se não couber)
- `w-80` (320px) — largura confortável sem ocupar a tela
- Conteúdo com `p-0` para a imagem encostar nas bordas; padding interno só no bloco de texto
- Não interfere com drag-and-drop: o HoverCard não captura eventos de mouse-down/drag

## Notas técnicas
- `HoverCard` do shadcn já existe em `src/components/ui/hover-card.tsx` — só importar
- Sem mudanças em hooks, schema, ou validação
- Sem novas dependências
- Funciona nas duas views (mês e semana) automaticamente, pois ambos os componentes são reusados nelas

## Arquivos editados/criados
- **Criado**: `src/components/schedule/PostHoverPreview.tsx`
- **Editado**: `src/components/schedule/PostCard.tsx`
- **Editado**: `src/components/schedule/GroupedPostCard.tsx`

