

## Correção: Scroll no Editor de Texto Modal

### Problema Identificado
O dialog de legenda expandida usa `overflow-hidden` no container, mas o `RichTextEditor` interno não possui:
1. Uma altura máxima definida para a área de edição
2. A propriedade `overflow-y: auto` no conteúdo do editor

Na screenshot, o texto é cortado na parte inferior sem possibilidade de rolar para ver o restante.

### Causa Raiz
No componente `RichTextEditor`:
- A classe `min-h-[200px]` define apenas altura mínima
- Não há `overflow-y-auto` aplicado ao `EditorContent`
- O container pai tem `overflow-hidden` que corta o conteúdo excedente

### Solução

Modificar o `RichTextEditor` para aceitar uma altura máxima e aplicar scroll quando necessário.

**Mudanças em `src/components/ui/rich-text-editor.tsx`:**

1. Adicionar prop `maxHeight` para controlar a altura máxima
2. Aplicar `overflow-y-auto` e `max-h` ao `EditorContent`
3. Criar wrapper com scroll para o conteúdo do editor

**Mudanças em `src/components/schedule/PostDetails.tsx`:**

1. Passar `maxHeight` ao RichTextEditor no dialog expandido

### Código Proposto

**RichTextEditor (atualizado):**

```tsx
export interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  maxHeight?: string; // Nova prop
}

export function RichTextEditor({
  // ...
  maxHeight = "none",
}: RichTextEditorProps) {
  // ...
  
  return (
    <div className={cn("flex flex-col", className)}>
      <EditorToolbar editor={editor} />
      <div 
        className={cn(
          "overflow-y-auto",
          maxHeight !== "none" && `max-h-[${maxHeight}]`
        )}
        style={maxHeight !== "none" ? { maxHeight } : undefined}
      >
        <EditorContent editor={editor} />
      </div>
      <div className="mt-2 text-right text-sm text-muted-foreground">
        {characterCount}/{maxLength} caracteres
      </div>
    </div>
  );
}
```

**PostDetails.tsx (dialog):**

```tsx
<RichTextEditor
  value={post.caption || ''}
  onChange={(value) => handleFieldUpdate('caption', value)}
  placeholder="Digite a legenda..."
  maxLength={2200}
  className="h-full"
  maxHeight="calc(85vh - 180px)"
/>
```

### Detalhes Técnicos

| Propriedade | Valor | Propósito |
|-------------|-------|-----------|
| `maxHeight` | `calc(85vh - 180px)` | Altura máxima considerando header, toolbar e contador |
| `overflow-y-auto` | - | Permite scroll vertical quando necessário |
| Inline style | Para calc() | Tailwind não suporta calc() dinâmico em classes |

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/ui/rich-text-editor.tsx` | Adicionar prop `maxHeight` e wrapper com scroll |
| `src/components/schedule/PostDetails.tsx` | Passar `maxHeight` ao RichTextEditor do dialog |

