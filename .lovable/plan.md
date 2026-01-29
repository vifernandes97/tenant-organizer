

## Visualizacao Separada: Modo Imagem vs Modo Editor

### Problema
Atualmente o FullscreenViewer exibe imagens e editor de legenda lado a lado. O usuario deseja poder alternar entre:
1. **Modo Imagem**: Tela cheia dedicada apenas a visualizacao das imagens
2. **Modo Editor**: Tela cheia dedicada apenas a edicao da legenda

### Solucao Proposta
Adicionar sistema de abas/toggle para alternar entre os dois modos, maximizando o espaco disponivel para cada funcao.

### Layout Proposto

**Modo Imagem (padrao):**
```text
┌─────────────────────────────────────────────────────────────────┐
│  Visualizacao em Tela Cheia          [Imagem] [Editor]    [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                                                                 │
│     [<]              IMAGEM PRINCIPAL              [>]          │
│                    (ocupa toda a area)                          │
│                                                                 │
│                                                                 │
│                           1 / 3                                 │
├─────────────────────────────────────────────────────────────────┤
│  [thumb1] [thumb2] [thumb3]                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Modo Editor:**
```text
┌─────────────────────────────────────────────────────────────────┐
│  Visualizacao em Tela Cheia          [Imagem] [Editor]    [X]   │
├─────────────────────────────────────────────────────────────────┤
│  Legenda                                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │              EDITOR DE TEXTO GRANDE                       │  │
│  │              (ocupa toda a area)                          │  │
│  │                                                           │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│  245/2200 caracteres                                            │
├─────────────────────────────────────────────────────────────────┤
│                                       [Cancelar] [Salvar]       │
└─────────────────────────────────────────────────────────────────┘
```

### Mudancas em `src/components/schedule/FullscreenViewer.tsx`

1. **Adicionar estado de modo**: `viewMode: 'image' | 'editor'`
2. **Adicionar toggle no header**: Usar `Tabs` ou botoes toggle para alternar entre modos
3. **Renderizacao condicional**: Mostrar apenas a secao ativa ocupando 100% do espaco
4. **Manter navegacao por teclado**: ArrowLeft/ArrowRight no modo imagem

### Detalhes Tecnicos

```tsx
const [viewMode, setViewMode] = useState<'image' | 'editor'>('image');
```

**Header com toggle:**
```tsx
<DialogHeader className="flex-shrink-0 border-b px-6 py-4">
  <div className="flex items-center justify-between">
    <DialogTitle>Visualizacao em Tela Cheia</DialogTitle>
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      <Button 
        variant={viewMode === 'image' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setViewMode('image')}
      >
        <Image className="mr-2 h-4 w-4" />
        Imagem
      </Button>
      <Button
        variant={viewMode === 'editor' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setViewMode('editor')}
      >
        <Type className="mr-2 h-4 w-4" />
        Editor
      </Button>
    </div>
  </div>
</DialogHeader>
```

**Conteudo condicional:**
```tsx
<div className="flex flex-1 overflow-hidden">
  {viewMode === 'image' ? (
    <ImageViewer ... />  // Ocupa 100% do espaco
  ) : (
    <CaptionEditor ... /> // Ocupa 100% do espaco
  )}
</div>
```

### Arquivos a Modificar
- `src/components/schedule/FullscreenViewer.tsx`

### Beneficios
- Imagens ocupam toda a viewport no modo imagem
- Editor de texto grande e confortavel no modo editor
- Transicao suave entre modos
- Mantém botoes de salvar/cancelar visiveis em ambos os modos

