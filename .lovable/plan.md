

## Edição Inline no Dialog de Legenda Expandida

### Problema Identificado
Ao clicar em "Expandir" na legenda, abre um dialog que mostra apenas o texto formatado em modo readonly (via `dangerouslySetInnerHTML`). O usuário quer poder editar diretamente nessa visualização expandida, com acesso à toolbar de formatação.

### Solução
Substituir o bloco de visualização readonly no dialog expandido pelo componente `RichTextEditor` completo, permitindo edição inline com:
- Toolbar de formatação (negrito, itálico, sublinhado, listas)
- Contador de caracteres
- Salvamento automático ao fechar o dialog

### Mudanças no Arquivo

**`src/components/schedule/PostDetails.tsx`**

**1. Adicionar import do RichTextEditor:**
```tsx
import { RichTextEditor } from '@/components/ui/rich-text-editor';
```

**2. Substituir o dialog de legenda expandida (linhas 350-363):**

De:
```tsx
<Dialog open={captionDialogOpen} onOpenChange={setCaptionDialogOpen}>
  <DialogContent className="max-w-3xl">
    <DialogHeader>
      <DialogTitle>Legenda</DialogTitle>
    </DialogHeader>
    <div 
      className="prose prose-sm dark:prose-invert max-h-[60vh] overflow-y-auto rounded-lg bg-muted/30 p-4"
      dangerouslySetInnerHTML={{ __html: post.caption || '' }}
    />
    <div className="text-right text-sm text-muted-foreground">
      {captionLength} caracteres
    </div>
  </DialogContent>
</Dialog>
```

Para:
```tsx
<Dialog open={captionDialogOpen} onOpenChange={setCaptionDialogOpen}>
  <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col">
    <DialogHeader>
      <DialogTitle>Legenda</DialogTitle>
    </DialogHeader>
    <div className="min-h-0 flex-1 overflow-hidden">
      <RichTextEditor
        value={post.caption || ''}
        onChange={(value) => handleFieldUpdate('caption', value)}
        placeholder="Digite a legenda..."
        maxLength={2200}
        className="h-full"
      />
    </div>
  </DialogContent>
</Dialog>
```

### UX Resultante

| Antes | Depois |
|-------|--------|
| Texto formatado readonly | Editor rico completo |
| Sem toolbar | Toolbar com negrito, itálico, listas, etc |
| Apenas visualização | Edição inline com auto-save |
| Contador estático | Contador dinâmico integrado |

### Comportamento Esperado
1. Usuário clica em "Expandir"
2. Dialog abre com o RichTextEditor já preenchido
3. Usuário pode formatar e editar o texto
4. Ao digitar, as mudanças são refletidas (o componente chama `onChange`)
5. O `handleFieldUpdate` salva automaticamente no banco

### Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/schedule/PostDetails.tsx` | Trocar div readonly por RichTextEditor no dialog expandido |

