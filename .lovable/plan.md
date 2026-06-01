## Problema

1. No modal de detalhes, quando um canal não tem mídias, aparece só o placeholder "Sem imagens". Para adicionar arquivos é preciso ir em **Editar**.
2. Em **Editar** (`PostForm`), as mídias mostradas são sempre as do primeiro canal do grupo (`selectedGroup.posts[0]`), independente da aba ativa no modal de detalhes — por isso parece "tudo junto".

## O que vai mudar

### 1. Upload direto no modal de detalhes (`GroupPostDetails.tsx`)

Na coluna da esquerda (galeria), substituir o estado vazio "Sem imagens" por uma área de upload usando os componentes já existentes:

- Canal `wordpress` → `FileUploader` (aceita PDF/DOCX/etc).
- Demais canais → `ImageUploader` (imagens/vídeos).

Comportamento:
- Os arquivos selecionados são enviados imediatamente via `useUpdatePost.mutateAsync({ id: activePost.id, newImages: files })` — o hook já sabe fazer upload no bucket `post-images` e criar as linhas em `post_images`.
- Durante o upload, mostrar um overlay com spinner.
- Após sucesso, o React Query invalida `posts`, o `activePost` chega com `post_images` atualizado, e o `useEffect` que depende de `activePost.id` reidrata `localImages`.
- Também adicionar um botão pequeno "Adicionar mídias" na barra de miniaturas (quando já existem imagens) para permitir anexar mais sem precisar excluir tudo.
- O upload é sempre para o canal da aba ativa — preserva o isolamento por canal.

### 2. Editar abre o canal correto (`Schedule.tsx` + `GroupPostDetails.tsx`)

- `GroupPostDetails` passa a expor o `activePost.id` (ou o objeto inteiro) via uma nova prop `onEdit(postId)` em vez do `onEdit()` atual.
- Em `Schedule.tsx`, `handleEditPost` recebe o `postId` e abre o `PostForm` com o post correspondente (`selectedGroup.posts.find(p => p.id === postId)`), e não mais `posts[0]`.
- Resultado: ao clicar em **Editar** com a aba "LinkedIn" ativa, o formulário carrega a legenda, mídias e status do post de LinkedIn — exatamente o que o usuário vê no modal de detalhes.

Não é necessário introduzir abas de canal dentro do `PostForm` em modo edição: cada canal já é uma linha em `posts`, e o modal de detalhes continua sendo o local certo para alternar entre canais.

## Fora de escopo

- Sem mudanças no backend, no schema de `post_images` ou em RLS.
- Sem alterações no fluxo de criação (`PostForm` em modo "novo post") — lá as mídias permanecem compartilhadas entre os canais escolhidos.
- Sem refator do `ImageUploader`/`FileUploader`.
