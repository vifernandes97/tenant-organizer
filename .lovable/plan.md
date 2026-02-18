
# Permitir excluir imagens individuais da postagem

## O que sera feito

Adicionar um botao de excluir (X) em cada thumbnail de imagem nos modais de detalhes do post. Ao clicar, exibe confirmacao e remove a imagem do banco e do storage. A lista local atualiza otimisticamente.

## Alteracoes

### 1. Criar hook `useDeletePostImage` em `src/hooks/usePosts.ts`

Nova mutation que:
- Busca o registro da `post_images` para obter o `image_url` (path no storage)
- Remove o arquivo do bucket `post-images` via `supabase.storage.from('post-images').remove([path])`
- Deleta o registro da tabela `post_images`
- Invalida queries de posts

### 2. Atualizar `src/components/schedule/PostDetails.tsx`

- Importar `useDeletePostImage` e o icone `X`
- Em cada thumbnail, adicionar um botao `X` no canto superior direito (visivel no hover)
- Ao clicar no X, mostrar confirmacao via `AlertDialog` ou simplesmente executar a exclusao com toast
- Apos a mutation, remover a imagem de `localImages` otimisticamente e ajustar `currentImageIndex` se necessario

### 3. Atualizar `src/components/schedule/GroupPostDetails.tsx`

- Mesma logica: botao X nos thumbnails com exclusao otimista de `localImages`

## Secao Tecnica

### Hook `useDeletePostImage`

```typescript
export function useDeletePostImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageId: string) => {
      // Buscar path da imagem
      const { data: img, error: fetchErr } = await supabase
        .from('post_images')
        .select('image_url')
        .eq('id', imageId)
        .single();
      if (fetchErr) throw fetchErr;

      // Remover do storage
      const path = extractStoragePath(img.image_url);
      await supabase.storage.from('post-images').remove([path]);

      // Deletar registro
      const { error } = await supabase
        .from('post_images')
        .delete()
        .eq('id', imageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post'] });
      toast.success('Imagem excluída!');
    },
    onError: () => {
      toast.error('Erro ao excluir imagem');
    },
  });
}
```

### Botao X no thumbnail (ambos componentes)

```tsx
<div key={img.id} className="relative flex items-center px-1 group">
  {/* Botao de excluir - visivel no hover */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      // Remover otimisticamente
      const updated = localImages.filter(i => i.id !== img.id);
      setLocalImages(updated);
      if (currentImageIndex >= updated.length) {
        setCurrentImageIndex(Math.max(0, updated.length - 1));
      }
      deleteImage.mutate(img.id);
    }}
    className="absolute -top-1 -right-1 z-20 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
  >
    <X className="h-3 w-3" />
  </button>
  {/* ... thumbnail existente ... */}
</div>
```

Para a imagem unica (quando so tem 1 imagem e a area de thumbnails nao aparece), adicionar o botao X na area principal da imagem.

## Arquivos alterados

- `src/hooks/usePosts.ts` — novo hook `useDeletePostImage`
- `src/components/schedule/PostDetails.tsx` — botao X nos thumbnails + importacoes
- `src/components/schedule/GroupPostDetails.tsx` — mesma logica
