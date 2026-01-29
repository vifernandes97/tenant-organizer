

## Correções no Modal de Detalhes da Publicação

### Problemas Identificados

**1. Botão de Editar não visível**
O botão de editar está presente no código (linha 223-226), mas o footer onde ele está pode estar sendo cortado em algumas resoluções de tela. Isso acontece porque:
- O painel direito usa `flex-1 overflow-y-auto` na área de conteúdo
- O footer está fixo na parte inferior, mas pode não estar acessível se o conteúdo central for muito grande

**2. Legenda não expansível**
Atualmente a legenda é exibida apenas como texto estático. Para uma experiência de apresentação, o usuário deveria poder clicar para ver a legenda formatada em tela cheia.

### Soluções Propostas

**1. Garantir visibilidade do footer com botões de ação**
- Mover o footer para uma posição mais proeminente ou garantir que ele sempre fique visível
- Adicionar uma sombra sutil para indicar que há conteúdo abaixo quando há scroll
- Reorganizar para que os botões de ação fiquem sempre acessíveis

**2. Adicionar visualizador de legenda expansível**
- Adicionar um botão de expandir ao lado do título "Legenda"
- Abrir um dialog de visualização apenas leitura com a legenda formatada
- Usar o RichTextEditor em modo somente leitura ou criar um componente de visualização

### Mudanças no Layout

```text
┌─────────────────────────────────────────────────────────────────┐
│  Legenda                                           [ Expandir ] │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Texto da legenda...                                         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘

Dialog expandido (somente leitura):
┌─────────────────────────────────────────────────────────────────┐
│  Legenda                                                   [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Texto da legenda com **formatação** preservada                 │
│  e múltiplas linhas visíveis...                                 │
│                                                                 │
│  - Item de lista                                                │
│  - Outro item                                                   │
│                                                                 │
│                                                    245 caracteres│
└─────────────────────────────────────────────────────────────────┘
```

### Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/schedule/PostDetails.tsx` | Ajustar layout do footer e adicionar visualizador de legenda expansível |

### Implementação

**1. Ajuste do layout do footer**
```tsx
{/* Right Column - agora com grid para garantir footer fixo */}
<div className="flex w-full flex-col lg:w-2/5 lg:border-l lg:border-t-0">
  {/* Header - fixo no topo */}
  <div className="border-b p-6">...</div>
  
  {/* Content - área com scroll */}
  <div className="flex-1 overflow-y-auto p-6">
    {/* Data, legenda, status */}
  </div>
  
  {/* Footer - fixo no fundo, com shadow para destacar */}
  <div className="border-t bg-background p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
    {/* Botões de ação */}
  </div>
</div>
```

**2. Seção de legenda com botão expandir**
```tsx
<div>
  <div className="mb-3 flex items-center justify-between">
    <h4 className="text-sm font-medium text-muted-foreground">Legenda</h4>
    {post.caption && (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setCaptionDialogOpen(true)}
      >
        <Maximize2 className="mr-1 h-3 w-3" />
        Expandir
      </Button>
    )}
  </div>
  {/* Preview da legenda */}
</div>

{/* Dialog de legenda em tela cheia */}
<Dialog open={captionDialogOpen} onOpenChange={setCaptionDialogOpen}>
  <DialogContent className="max-w-3xl">
    <DialogHeader>
      <DialogTitle>Legenda</DialogTitle>
    </DialogHeader>
    <div 
      className="prose prose-sm max-h-[60vh] overflow-y-auto rounded-lg bg-muted/30 p-4"
      dangerouslySetInnerHTML={{ __html: post.caption || '' }}
    />
    <div className="text-right text-sm text-muted-foreground">
      {displayCaption?.length || 0} caracteres
    </div>
  </DialogContent>
</Dialog>
```

### Ordem de Implementação

1. Adicionar estado para controlar dialog de legenda
2. Criar a seção de legenda com botão de expandir
3. Adicionar dialog de visualização da legenda formatada
4. Ajustar layout do footer para garantir visibilidade
5. Adicionar sombra sutil no footer para indicar separação

