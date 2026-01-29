
## Editor de Texto Rico com Formatacao

### Visao Geral
Adicionar suporte a formatacao de texto no editor de legenda (ExpandableTextarea) usando a biblioteca **Tiptap** - um editor headless baseado em ProseMirror que oferece excelente suporte para React e TypeScript, alem de ser altamente customizavel.

### Por que Tiptap?

| Criterio | Tiptap | Lexical | Slate |
|----------|--------|---------|-------|
| Facilidade de integracao | Alta | Media | Media |
| TypeScript nativo | Sim | Sim | Sim |
| Peso do bundle | Leve (tree-shakable) | Medio | Pesado |
| Extensoes prontas | Muitas | Poucas | Manual |
| Curva de aprendizado | Baixa | Alta | Media |

### Consideracao Importante: Redes Sociais

As redes sociais (Instagram, TikTok, etc.) **nao suportam HTML nativo** nas legendas. No entanto, a formatacao no editor e util para:

1. **Visualizacao e organizacao** durante a escrita
2. **Exportacao futura** com conversao para unicode (caracteres especiais como 𝗻𝗲𝗴𝗿𝗶𝘁𝗼)
3. **Posts em plataformas que suportam** (LinkedIn, Twitter com limitacoes, WordPress)

O sistema armazenara o conteudo em formato HTML internamente, com opcao de converter para texto plano ao publicar.

### Interface da Barra de Ferramentas

```text
┌─────────────────────────────────────────────────────────────────┐
│  Editor de Legenda                                         [X]  │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [B] [I] [U] [S] │ [≡] [•] │ [T▾]  │ [↩] [↪]               │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  Texto formatado aqui...                                  │  │
│  │  Com **negrito** e _italico_                              │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│  245/2200 caracteres                                            │
├─────────────────────────────────────────────────────────────────┤
│                                       [Cancelar] [Aplicar]      │
└─────────────────────────────────────────────────────────────────┘
```

**Legenda dos botoes:**
- `[B]` Negrito (Bold)
- `[I]` Italico
- `[U]` Sublinhado (Underline)
- `[S]` Tachado (Strikethrough)
- `[≡]` Lista ordenada
- `[•]` Lista com marcadores
- `[T▾]` Tamanho do texto (dropdown)
- `[↩][↪]` Desfazer/Refazer

### Arquitetura do Componente

```text
┌─────────────────────────────────────────────────────────────────┐
│                     RichTextEditor                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 EditorToolbar                             │  │
│  │  - Botoes de formatacao                                   │  │
│  │  - Toggle states (negrito ativo, etc)                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 EditorContent (Tiptap)                    │  │
│  │  - Area de edicao                                         │  │
│  │  - Extensoes: Bold, Italic, Underline, etc               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│             ExpandableTextarea (atualizado)                     │
│  - Modo compacto: preview do HTML como texto                    │
│  - Modo fullscreen: RichTextEditor completo                     │
└─────────────────────────────────────────────────────────────────┘
```

### Dependencias a Adicionar

```json
{
  "@tiptap/react": "^2.x",
  "@tiptap/starter-kit": "^2.x",
  "@tiptap/extension-underline": "^2.x",
  "@tiptap/extension-text-style": "^2.x",
  "@tiptap/extension-font-size": "^2.x",
  "@tiptap/extension-placeholder": "^2.x",
  "@tiptap/extension-character-count": "^2.x"
}
```

### Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/ui/rich-text-editor.tsx` | Componente principal do editor rico |
| `src/components/ui/editor-toolbar.tsx` | Barra de ferramentas de formatacao |

### Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/ui/expandable-textarea.tsx` | Substituir Textarea por RichTextEditor no modo fullscreen |
| `package.json` | Adicionar dependencias do Tiptap |

### Componente RichTextEditor

```tsx
interface RichTextEditorProps {
  value?: string;           // HTML content
  onChange?: (html: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

// Extensoes utilizadas
const extensions = [
  StarterKit.configure({
    // Desabilita funcionalidades desnecessarias
    heading: false,
    codeBlock: false,
  }),
  Underline,
  TextStyle,
  FontSize.configure({
    types: ['textStyle'],
  }),
  Placeholder.configure({
    placeholder: 'Escreva sua legenda...',
  }),
  CharacterCount.configure({
    limit: 2200,
  }),
];
```

### Componente EditorToolbar

```tsx
interface EditorToolbarProps {
  editor: Editor | null;
}

// Formatacoes disponiveis
const formatButtons = [
  { icon: Bold, action: 'toggleBold', active: 'bold' },
  { icon: Italic, action: 'toggleItalic', active: 'italic' },
  { icon: Underline, action: 'toggleUnderline', active: 'underline' },
  { icon: Strikethrough, action: 'toggleStrike', active: 'strike' },
];

const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px'];
```

### Fluxo de Dados

```text
   PostForm
      │
      ▼
ExpandableTextarea ◄──── value (HTML string)
      │
      ├── Modo compacto: exibe texto sem tags
      │
      └── Modo fullscreen:
            │
            ▼
      RichTextEditor
            │
            ├── EditorToolbar (controles)
            │
            └── EditorContent (Tiptap)
                    │
                    ▼
              onChange(html)
```

### Estilos do Editor

O editor tera estilos consistentes com o design system atual:

```tsx
// Estilos da area de edicao
const editorStyles = `
  .ProseMirror {
    min-height: 200px;
    padding: 12px;
    border: 1px solid hsl(var(--input));
    border-radius: var(--radius);
    background: hsl(var(--background));
    outline: none;
    
    &:focus {
      ring: 2px;
      ring-color: hsl(var(--ring));
    }
  }
  
  .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    color: hsl(var(--muted-foreground));
    pointer-events: none;
  }
`;
```

### Detalhes Tecnicos

1. **Armazenamento**: O conteudo sera armazenado como HTML no campo `caption` do banco
2. **Contador de caracteres**: Usa `CharacterCount` extension que conta texto sem tags
3. **Atalhos de teclado**: Tiptap inclui nativamente (Ctrl+B, Ctrl+I, etc)
4. **Undo/Redo**: Gerenciado automaticamente pelo StarterKit
5. **Modo compacto**: Extrai texto plano do HTML para preview

### Funcao de Extracao de Texto

Para o modo compacto e para publicacao em redes sociais:

```tsx
const extractPlainText = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};
```

### Conversao para Unicode (futuro)

Para redes sociais, e possivel converter formatacao para caracteres unicode:

```text
Texto normal  →  Texto normal
**Negrito**   →  𝗧𝗲𝘅𝘁𝗼 𝗻𝗲𝗴𝗿𝗶𝘁𝗼
_Italico_     →  𝘛𝘦𝘹𝘵𝘰 𝘪𝘵𝘢𝘭𝘪𝘤𝘰
```

Esta funcionalidade pode ser adicionada futuramente como opcao de exportacao.

### Ordem de Implementacao

1. Instalar dependencias do Tiptap
2. Criar componente EditorToolbar
3. Criar componente RichTextEditor
4. Atualizar ExpandableTextarea para usar RichTextEditor no fullscreen
5. Adicionar estilos CSS do editor
6. Testar integracao com PostForm

### Beneficios

- Editor profissional similar ao ClickUp/Notion
- Atalhos de teclado nativos
- Facil extensao para novas formatacoes
- Leve e performatico (tree-shakable)
- TypeScript completo
- Reutilizavel em outros campos de texto

