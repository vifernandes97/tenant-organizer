

## Icone de Expandir em Tela Cheia no Textarea

### Visao Geral
Adicionar um icone de expansao (como no ClickUp) no campo de textarea do PostForm que abre um editor de texto em tela cheia. Isso permite ao usuario escrever legendas longas com mais conforto visual.

### Layout de Referencia (ClickUp)

```text
┌─────────────────────────────────────────────────────────────────┐
│  Legenda  245/2200                                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                       [⤢] │  │
│  │  Texto da legenda aqui...                                 │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                                      ▲
                                              Icone de expandir
```

### Componentes a Criar/Modificar

**1. Novo Componente: `ExpandableTextarea`**

Um componente wrapper que combina o Textarea existente com um botao de expandir e um Dialog de edicao em tela cheia.

```tsx
// src/components/ui/expandable-textarea.tsx
interface ExpandableTextareaProps extends TextareaProps {
  value?: string;
  onChange?: (value: string) => void;
  maxLength?: number;
  label?: string;
}
```

**2. Dialog de Editor em Tela Cheia**

Reutilizar estrutura similar ao modo Editor do `FullscreenViewer`, mas como componente independente.

```text
┌─────────────────────────────────────────────────────────────────┐
│  Editor de Legenda                                         [X]  │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │              TEXTAREA GRANDE                              │  │
│  │              (ocupa toda a area)                          │  │
│  │                                                           │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│  245/2200 caracteres                                            │
├─────────────────────────────────────────────────────────────────┤
│                                       [Cancelar] [Aplicar]      │
└─────────────────────────────────────────────────────────────────┘
```

### Estrutura do Componente

```tsx
export function ExpandableTextarea({ 
  value, 
  onChange, 
  maxLength = 2200,
  placeholder,
  className,
  ...props 
}: ExpandableTextareaProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');

  const handleApply = () => {
    onChange?.(tempValue);
    setIsFullscreen(false);
  };

  return (
    <div className="relative">
      {/* Textarea com icone de expandir */}
      <Textarea 
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn("pr-10", className)}
        {...props}
      />
      
      {/* Botao de expandir */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => {
          setTempValue(value || '');
          setIsFullscreen(true);
        }}
        className="absolute right-2 top-2 h-7 w-7 opacity-60 hover:opacity-100"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>

      {/* Dialog de tela cheia */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="flex h-[90vh] max-w-4xl flex-col">
          <DialogHeader>
            <DialogTitle>Editor de Legenda</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-1 flex-col">
            <Textarea
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="flex-1 resize-none text-base"
              maxLength={maxLength}
            />
            <div className="mt-2 text-right text-sm text-muted-foreground">
              {tempValue.length}/{maxLength} caracteres
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsFullscreen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApply}>
              Aplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

### Integracao no PostForm

Substituir o Textarea atual pela versao expandivel:

```tsx
// Antes
<Textarea
  placeholder="Escreva a legenda do post..."
  className="min-h-[120px] resize-none"
  {...field}
/>

// Depois
<ExpandableTextarea
  value={field.value}
  onChange={field.onChange}
  placeholder="Escreva a legenda do post..."
  className="min-h-[120px] resize-none"
  maxLength={2200}
/>
```

### Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/ui/expandable-textarea.tsx` | Componente de textarea com expansao |

### Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/schedule/PostForm.tsx` | Substituir Textarea por ExpandableTextarea no campo de legenda |

### Detalhes Tecnicos

1. **Integracao com react-hook-form**: O componente funciona com `field.value` e `field.onChange` do FormField
2. **Estado temporario**: O valor no fullscreen e armazenado em estado local ate o usuario clicar "Aplicar"
3. **Cancelamento**: Ao cancelar, o valor original e mantido
4. **Contador de caracteres**: Visivel tanto no textarea normal quanto no fullscreen
5. **Icone discreto**: Posicionado no canto superior direito, com opacidade reduzida ate hover

### Beneficios

- Experiencia similar ao ClickUp para usuarios familiarizados
- Reutilizavel em qualquer textarea do sistema
- Nao afeta o fluxo existente - apenas adiciona opcao de expandir
- Suporte a maxLength e contador de caracteres

