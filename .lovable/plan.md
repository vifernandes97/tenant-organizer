
# Exibir o texto completo do comentário

## Problema

No `CommentItem`, o parágrafo com o conteúdo do comentário tem a classe `line-clamp-2`, que limita o texto a 2 linhas e adiciona "..." no final — como mostrado na imagem enviada.

## Solução

Remover a classe `line-clamp-2` do parágrafo do conteúdo do comentário em `src/components/comments/CommentItem.tsx` (linha 153), permitindo que o texto seja exibido integralmente.

## Arquivo alterado

### `src/components/comments/CommentItem.tsx` — linha 153

**Antes:**
```tsx
<p className="mt-0.5 text-sm text-foreground line-clamp-2 whitespace-pre-wrap">
```

**Depois:**
```tsx
<p className="mt-0.5 text-sm text-foreground whitespace-pre-wrap">
```

Nenhuma alteração de banco de dados necessária — é uma mudança puramente visual de CSS.
