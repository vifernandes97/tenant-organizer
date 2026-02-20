
# Corrigir dados desatualizados no modal ao trocar de post

## Causa Raiz

O componente `GroupPostDetails` fica sempre montado no DOM. Quando o usuário fecha um modal e abre outro post, o React recebe:
1. `group` → novo grupo
2. `open` → true

Mas os estados locais (`currentImageIndex`, `activeTab`, `activeCommentId`, `localImages`, `activeChannel`) ainda guardam os valores do post anterior. O `useMemo` que tenta resetar o `activeChannel` não é garantido de rodar de forma síncrona e não reseta os outros estados.

A solução é mover o reset para um `useEffect` que observa `group?.groupId`, garantindo que todos os estados sejam zerados quando o grupo mudar.

## Solução

### `src/components/schedule/GroupPostDetails.tsx`

Substituir o `useMemo` que faz reset (linhas 80-85) por um `useEffect` que reseta **todos** os estados locais quando o `groupId` muda:

```typescript
useEffect(() => {
  if (group && group.posts.length > 0) {
    setActiveChannel(group.posts[0].channel);
    setCurrentImageIndex(0);
    setActiveTab('details');
    setActiveCommentId(null);
    setLocalImages(group.posts[0].post_images || []);
    setDragIndex(null);
    setDragOverIndex(null);
  }
}, [group?.groupId]);
```

Isso garante que, ao receber um novo `groupId`, o modal limpa imediatamente todos os estados antes de renderizar o conteúdo do novo post.

## Seção Técnica

### Por que `useMemo` não resolve

`useMemo` é uma otimização de performance, não uma garantia de efeito colateral. O React pode ignorar o cache do `useMemo` e recomputar em qualquer momento — mas o problema principal é que `useMemo` **não deve** ser usado para disparar `setState`, pois isso cria renders inconsistentes.

### Por que `useEffect` resolve

`useEffect` roda **após** o commit do render. Ao mudar o `group?.groupId`:
1. React renderiza com o novo `group` mas estados ainda antigos
2. `useEffect` dispara e reseta todos os estados
3. React re-renderiza com os estados corretos

O flash visual é mínimo (um frame), mas é muito menos perceptível do que a situação atual onde dados antigos ficam visíveis por vários segundos enquanto carregam os novos.

### Alternativa mais robusta (também implementada)

Adicionar uma `key` no componente a partir do `Schedule.tsx`:

```tsx
<GroupPostDetails
  key={selectedGroup?.groupId || 'empty'}
  group={selectedGroup}
  open={isDetailsOpen}
  onOpenChange={setIsDetailsOpen}
  onEdit={handleEditPost}
/>
```

Isso força o React a **desmontar e remontar** o componente quando o `groupId` muda, resetando absolutamente todos os estados e hooks de uma vez. Esta é a abordagem mais segura e definitiva.

## Arquivos alterados

- `src/pages/Schedule.tsx` — adicionar `key={selectedGroup?.groupId || 'empty'}` no `<GroupPostDetails>`
- `src/components/schedule/GroupPostDetails.tsx` — substituir o `useMemo` de reset por `useEffect` que reseta todos os estados
