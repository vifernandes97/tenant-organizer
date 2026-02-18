
# Melhorar indicador visual do drag and drop nas imagens

## O que sera feito

Substituir o efeito atual (ring + scale) por uma barra colorida vertical que aparece entre as miniaturas, indicando claramente onde a imagem sera inserida ao soltar. Isso torna a interacao muito mais intuitiva.

## Como funciona

1. Ao arrastar uma imagem sobre outra miniatura, uma barra vertical colorida (azul/primary) aparece no lado esquerdo ou direito da miniatura alvo, indicando a posicao de insercao
2. A imagem sendo arrastada fica com opacidade reduzida
3. A barra tem uma animacao sutil (pulse) para chamar atencao

## Secao Tecnica

### Abordagem

Em vez de aplicar estilos na propria miniatura alvo, renderizar um elemento separado (barra divisoria) entre as miniaturas. A logica sera:

- Trocar o container de `gap-2` para `gap-0` e controlar o espacamento via padding/margin nos itens
- Cada thumbnail sera envolvido em um wrapper `div` que inclui a barra indicadora como pseudo-elemento ou elemento condicional
- A barra aparece a esquerda do item quando `dragOverIndex === idx` e `dragIndex > idx`, ou a direita quando `dragIndex < idx`

**Simplificacao**: usar uma abordagem mais direta — cada thumbnail tera um `before` ou `after` visual (um `div` de 3px de largura com cor primary) que aparece condicionalmente baseado em `dragOverIndex`.

### Alteracoes em `src/components/schedule/PostDetails.tsx` (linhas 198-230)

- Envolver cada `button` de thumbnail em um `div` com `position: relative`
- Adicionar um `div` condicional com classes `absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-full` (barra esquerda) ou no lado direito, dependendo da direcao do arraste
- Reduzir opacidade do item sendo arrastado (`dragIndex === idx ? 'opacity-40' : ''`)
- Remover o efeito `scale-110` e `ring-accent` atual

### Alteracoes em `src/components/schedule/GroupPostDetails.tsx` (linhas 288-339)

- Mesma logica aplicada ao thumbnails do post ativo

### Logica da barra

```typescript
// Mostrar barra a esquerda se o item arrastado vem de depois
const showLeftBar = dragOverIndex === idx && dragIndex !== null && dragIndex > idx && dragIndex !== idx;
// Mostrar barra a direita se o item arrastado vem de antes  
const showRightBar = dragOverIndex === idx && dragIndex !== null && dragIndex < idx && dragIndex !== idx;
```

A barra tera:
- Largura: 3px
- Cor: `bg-primary` (azul do tema)
- Altura: 100% do thumbnail
- Bordas arredondadas
- Animacao: `animate-pulse` sutil

### Arquivos alterados
- `src/components/schedule/PostDetails.tsx`
- `src/components/schedule/GroupPostDetails.tsx`
