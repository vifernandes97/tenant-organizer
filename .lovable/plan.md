
## Correção: Exibição da Formatação da Legenda

### Problema Identificado
O editor rico (Tiptap) salva a legenda como HTML com tags de formatação:
```html
<p>Logística door to door não é apenas sobre contratar um frete.</p>
<p>É sobre entender as necessidades do cliente...</p>
```

Mas na exibição, a função `extractPlainText()` remove todas as tags HTML, gerando texto corrido sem quebras de linha.

### Solução

Modificar a exibição para renderizar o HTML diretamente, preservando:
- Quebras de parágrafo (`<p>`)
- Negrito (`<strong>`)
- Itálico (`<em>`)
- Sublinhado (`<u>`)
- Listas (`<ul>`, `<ol>`)

### Mudanças no Arquivo

**`src/components/schedule/PostDetails.tsx`**

**1. Visualização compacta da legenda (linhas 207-213)**

De:
```tsx
{displayCaption ? (
  <div className="max-h-[200px] overflow-y-auto rounded-lg bg-muted/50 p-4">
    <p className="whitespace-pre-wrap text-sm">{displayCaption}</p>
  </div>
) : (
  <p className="text-sm italic text-muted-foreground">Sem legenda</p>
)}
```

Para:
```tsx
{post.caption ? (
  <div 
    className="prose prose-sm dark:prose-invert max-h-[200px] max-w-none overflow-y-auto rounded-lg bg-muted/50 p-4"
    dangerouslySetInnerHTML={{ __html: post.caption }}
  />
) : (
  <p className="text-sm italic text-muted-foreground">Sem legenda</p>
)}
```

**2. Manter `extractPlainText` apenas para contagem de caracteres**

A função `extractPlainText` continuará sendo usada apenas para calcular o número de caracteres (sem tags HTML), exibido no contador.

**3. Adicionar estilos prose para formatação correta**

A classe `prose prose-sm dark:prose-invert max-w-none` do Tailwind Typography garante que:
- Parágrafos tenham espaçamento adequado
- Negrito, itálico e sublinhado sejam exibidos corretamente
- Listas tenham marcadores
- O tema dark seja respeitado

### Resumo Visual

| Antes | Depois |
|-------|--------|
| Texto corrido sem quebras | Parágrafos separados |
| Formatação (negrito, itálico) perdida | Formatação preservada |
| `extractPlainText` → texto puro | `dangerouslySetInnerHTML` → HTML renderizado |

### Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/schedule/PostDetails.tsx` | Trocar exibição de texto puro para HTML renderizado com classes prose |
