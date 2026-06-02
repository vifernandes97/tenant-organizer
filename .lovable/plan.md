# Comentários gerais (sem âncora em imagem)

Hoje só dá pra criar comentários clicando em uma imagem (via `ImageCommentLayer`), o que bloqueia posts sem mídia. Vou adicionar um caminho de criação geral, mantendo o pin de imagem como hoje quando o usuário clica numa foto.

## Mudanças

### 1. `src/components/comments/CommentsList.tsx`
- Adicionar um formulário/botão "Novo comentário" no topo da lista (acima dos filtros ou logo abaixo).
- Estado local `isComposing` que alterna entre botão "Adicionar comentário" e o `CommentForm` inline.
- Ao enviar, chama `useCreateComment` com:
  - `post_id`
  - `image_id: null`
  - `x_position: null`, `y_position: null`
  - sem `parent_id`
- Reaproveita o `CommentForm` já existente.

### 2. Sem mudanças de schema
- A tabela `post_comments` já permite `image_id`, `x_position` e `y_position` como nulos. RLS atual já cobre criação por usuários com acesso ao post.
- O `useCreateComment` já aceita esses campos opcionais — nenhuma mudança no hook.

### 3. Comportamento mantido
- Clicar numa imagem continua criando comentário com pin (x/y + image_id). Esse fluxo não muda.
- `CommentsList` já lista todos os comentários do post (raiz), então os gerais aparecerão junto dos ancorados.
- Filtros (Todos / Abertos / Resolvidos) continuam funcionando.

### 4. Indicação visual (pequeno detalhe)
- No `CommentItem`, quando o comentário não tem `x_position`/`image_id`, não mostrar número de pin/imagem (já é o caso quando `imageNumber` é undefined). Sem mudanças necessárias se já trata isso.

## Fora do escopo
- Sem alterações em backend, RLS, ou no fluxo de pin sobre imagem.
- Sem mudanças em `PostDetails` / `GroupPostDetails` — a aba "Comentários" já renderiza `CommentsList`.
