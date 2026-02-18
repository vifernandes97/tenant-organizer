

# Corrigir atualizacao visual apos reordenar imagens

## Problema

Quando o usuario reordena as imagens, a mutation salva corretamente no banco e invalida o cache. Porem, o componente pai (`Schedule.tsx`) mantem o `selectedGroup` em um estado local que e uma "foto" do momento em que o post foi clicado. Mesmo apos o refetch dos dados, esse estado nao e atualizado, entao o modal continua mostrando a ordem antiga.

## Solucao

Usar estado local para a lista de imagens nos dois componentes de detalhes. Esse estado sincroniza com a prop (quando o modal abre ou o post muda), mas e atualizado imediatamente ao soltar a imagem (atualizacao otimista).

## Alteracoes

### `src/components/schedule/PostDetails.tsx`
1. Adicionar `useState` para `localImages`, inicializado a partir de `post.post_images`
2. Adicionar `useEffect` para sincronizar `localImages` quando `post` mudar (ex: quando o modal abre)
3. No `onDrop`, alem de chamar `reorderImages.mutate`, atualizar `localImages` com a nova ordem
4. Usar `localImages` em vez de `images` em todo o componente (galeria principal + thumbnails)

### `src/components/schedule/GroupPostDetails.tsx`
1. Mesma abordagem: `useState` + `useEffect` para `localImages`, sincronizado com `activePost.post_images`
2. O `useEffect` tambem deve reagir a mudancas de `activePost` (quando o usuario troca de aba/canal)
3. No `onDrop`, atualizar `localImages` otimisticamente
4. Usar `localImages` em todo o componente

## Secao Tecnica

```typescript
// Em ambos os componentes:
const [localImages, setLocalImages] = useState(post?.post_images || []);

useEffect(() => {
  setLocalImages(post?.post_images || []);
}, [post?.post_images]);

// No onDrop:
const reordered = [...localImages];
const [moved] = reordered.splice(dragIndex, 1);
reordered.splice(idx, 0, moved);
setLocalImages(reordered); // atualizacao otimista
reorderImages.mutate(reordered.map((img, i) => ({ id: img.id, display_order: i })));
```

## Arquivos alterados
- `src/components/schedule/PostDetails.tsx`
- `src/components/schedule/GroupPostDetails.tsx`
