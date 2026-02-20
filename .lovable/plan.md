
# Permitir edição de comentários

## O que será feito

Adicionar a funcionalidade de editar o conteúdo de um comentário diretamente no `CommentItem`. O hook `useUpdateComment` já existe em `useComments.ts` e o banco já permite a operação via RLS.

## Comportamento esperado

- Apenas o autor do comentário ou o owner poderão ver o botão "Editar"
- Ao clicar em "Editar", o texto do comentário vira um campo de texto editável (textarea inline)
- Aparecem botões "Salvar" e "Cancelar"
- Ao salvar, chama `useUpdateComment` e exibe toast de sucesso
- Ao cancelar, volta ao texto original sem salvar

## Arquivo alterado

### `src/components/comments/CommentItem.tsx`

1. Importar `useUpdateComment` e `useState` do React
2. Adicionar estado `isEditing` e `editContent`
3. No bloco de ações (hover), adicionar botão "Editar" visível apenas para `canModify`
4. Renderizar condicionalmente: quando `isEditing` for `true`, exibir um `<textarea>` com o conteúdo atual + botões "Salvar" / "Cancelar" em vez do texto normal
5. Ao salvar, chamar `updateComment.mutate({ id: comment.id, content: editContent })`

## Seção técnica

### Fluxo de estado

```text
isEditing = false  →  exibe texto + botão "Editar" no hover
isEditing = true   →  exibe <textarea> + botões "Salvar" e "Cancelar"
```

### Permissões (já implementadas no banco)

RLS `Users can update own comments`:
- `author_id = auth.uid()` → autor pode editar
- `has_role(auth.uid(), 'owner')` → owner pode editar

No frontend, o botão "Editar" usa a mesma variável `canModify` já existente no componente.

### Nenhuma alteração de banco necessária

O hook `useUpdateComment` e as políticas RLS já estão prontos.
