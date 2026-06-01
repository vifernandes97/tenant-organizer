## Problema

Hoje, ao abrir o modal de detalhes de uma postagem agrupada, as abas de canal aparecem mas os campos exibidos (mídias, legenda, status, artigo do WordPress) não trocam de verdade ao alternar de aba — continuam refletindo a primeira postagem do grupo. Causa principal:

- `localImages` é inicializado apenas no `useEffect` que depende de `group.groupId`, e nunca é resincronizado quando `activeChannel` muda.
- O `InlineRichTextEditor` da legenda mantém estado interno do TipTap; ao trocar de aba ele só atualiza se não estiver em foco, criando a sensação de "mesmo campo".
- Quando há apenas 1 canal, as abas nem aparecem (`isMultiChannel` esconde a barra).

## O que vai mudar (apenas frontend, em `src/components/schedule/GroupPostDetails.tsx`)

1. **Abas de canal sempre visíveis** — uma aba por canal da postagem, mesmo quando há só um. Cabeçalho "Canais" continua aparecendo.
2. **Mídias por canal** — `localImages` passa a sincronizar com `activePost.post_images` sempre que `activePost.id` mudar (novo `useEffect` dependente de `activePost.id`). Reordenação/exclusão continuam afetando apenas o post do canal ativo.
3. **Legenda por canal** — adicionar `key={activePost.id}` ao `InlineRichTextEditor` (e ao `RichTextEditor` do diálogo "Expandir") para forçar remount ao trocar de aba, garantindo que o conteúdo carregado seja sempre o do canal atual. O draft do modal expandido (`captionDraft`) também é resetado ao trocar de canal.
4. **WordPress** — quando a aba ativa for `wordpress`, a legenda é substituída pelos campos do artigo (`article_title`, `seo_keyword`, `project_type`, `article_content`) — comportamento já existente, mantido e também recebe `key={activePost.id}` no `RichTextEditor` do artigo para evitar conteúdo "preso".
5. **Status e contagem de comentários** continuam por canal (já estão), agora ficam consistentes com mídias/legenda também trocando.
6. Campos compartilhados (Cliente, Data/Hora, Título) permanecem com `handleSharedFieldUpdate` — comportamento atual mantido.

## Fora de escopo

- Não alterar `PostForm` (criação/edição em massa) nem `PostDetails` (não está mais em uso).
- Sem mudanças de schema ou backend — cada canal já é uma linha em `posts` com `group_id` compartilhado.
- Sem alterações no layout do modal além das abas sempre visíveis.
