

# Reordenar imagens de cada post

## O que sera feito

Adicionar a funcionalidade de arrastar e soltar (drag and drop) nas miniaturas de imagens dentro dos detalhes da publicacao, permitindo ao usuario reorganizar a ordem das imagens. A nova ordem sera salva automaticamente no banco de dados usando a coluna `display_order` que ja existe na tabela `post_images`.

## Como funciona

1. O usuario abre os detalhes de uma publicacao que tenha mais de uma imagem
2. Na barra de miniaturas (thumbnails) na parte inferior da galeria, o usuario arrasta uma imagem para a posicao desejada
3. As miniaturas se reorganizam visualmente durante o arraste
4. Ao soltar, a nova ordem e salva automaticamente no banco de dados
5. Um toast confirma que a ordem foi atualizada

## Secao Tecnica

### Nova mutation em `src/hooks/usePosts.ts`
- Criar `useReorderPostImages` que recebe um array de `{ id: string, display_order: number }` e atualiza cada registro na tabela `post_images`
- Invalida as queries de posts apos sucesso

### Alteracoes em `src/components/schedule/PostDetails.tsx`
- Implementar drag and drop nativo (HTML5 Drag and Drop API) na area de thumbnails (linhas 190-206)
- Adicionar estados para controlar o item sendo arrastado e a posicao de destino
- Ao concluir o arraste, chamar a mutation `useReorderPostImages`
- Adicionar cursor `grab` nas miniaturas para indicar que sao arrastáveis

### Alteracoes em `src/components/schedule/GroupPostDetails.tsx`
- Mesma logica de drag and drop aplicada a area de thumbnails do post ativo
- Usa a mesma mutation `useReorderPostImages`

### Abordagem tecnica
- Usar a API nativa de Drag and Drop do HTML5 (sem biblioteca externa)
- Eventos: `onDragStart`, `onDragOver`, `onDragEnd`, `onDrop`
- Estado local para reordenar visualmente antes de salvar
- Atualizar `display_order` de todas as imagens do post com a nova ordem
- A coluna `display_order` ja existe e ja e usada na query de busca dos posts

### Garantir ordenacao correta
- Verificar que as queries em `usePosts.ts` ordenam por `display_order` (o Supabase ordena relacoes pela chave primaria por padrao; pode ser necessario adicionar `.order` na relacao `post_images`)
