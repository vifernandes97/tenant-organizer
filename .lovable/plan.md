

## Modal de Visualizacao de Publicacao Expandido

### Visao Geral
Transformar o modal de detalhes da publicacao em um layout amplo e profissional, ocupando 90% da largura do viewport. O novo design utiliza um layout de duas colunas para exibir imagens e informacoes lado a lado, eliminando a necessidade de scroll e proporcionando uma experiencia ideal para apresentacao e aprovacao de conteudo.

### Layout Proposto

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  [X]                                                                                     │
│  ┌────────────────────────────────────────────┬─────────────────────────────────────────┐│
│  │                                            │  📱 Instagram Feed                      ││
│  │                                            │  Cliente: Marca ABC                     ││
│  │                                            │  ┌─────────────────────────────────────┐││
│  │                                            │  │ 🟢 Aprovado                         │││
│  │           IMAGEM PRINCIPAL                 │  └─────────────────────────────────────┘││
│  │              (grande)                      │                                         ││
│  │                                            │  📅 Segunda-feira, 3 de fevereiro 2026  ││
│  │                                            │  🕐 14:30                               ││
│  │                                            │  ─────────────────────────────────────  ││
│  │                                            │                                         ││
│  │                                            │  Legenda                                ││
│  │                                            │  ┌─────────────────────────────────────┐││
│  │                                            │  │ Texto da legenda completo           │││
│  │  [⬅]                              [➡]      │  │ com multiplas linhas e              │││
│  │                                            │  │ formatacao preservada...            │││
│  ├────────────────────────────────────────────┤  └─────────────────────────────────────┘││
│  │ [img1] [img2] [img3] [img4]                │                                         ││
│  └────────────────────────────────────────────┤  Alterar Status                         ││
│                                               │  [ Aprovado ▼ ]                         ││
│                                               │                                         ││
│                                               │  ─────────────────────────────────────  ││
│                                               │                                         ││
│                                               │  [ ✏️ Editar ]  [ 📋 ]  [ 🗑️ ]          ││
│                                               │                                         ││
│                                               │  Criado: 28/01/2026 10:30              ││
│                                               │  Atualizado: 29/01/2026 14:15          ││
│                                               └─────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### Mudancas Principais

**1. Componente Dialog em vez de Sheet**
- Substituir o `Sheet` (painel lateral) por `Dialog` (modal centralizado)
- Largura de 90vw para ocupar quase toda a tela horizontal
- Altura de 90vh para aproveitar o espaco vertical

**2. Layout de Duas Colunas**
- **Coluna Esquerda (60%)**: Area de imagem grande com navegacao e thumbnails
- **Coluna Direita (40%)**: Informacoes do post, status, legenda e acoes

**3. Galeria de Imagens Melhorada**
- Imagem principal em tamanho grande
- Botoes de navegacao sobrepostos (setas esquerda/direita)
- Thumbnails na parte inferior para navegacao rapida
- Contador de imagens (1/4)

**4. Painel de Informacoes**
- Header com icone do canal e badge de status
- Data e hora formatados com icones
- Legenda em area com scroll proprio se necessario
- Seletor de status destacado para aprovacao rapida
- Acoes agrupadas no rodape

### Beneficios para Apresentacao

| Antes | Depois |
|-------|--------|
| Modal lateral estreito (max 500px) | Modal centralizado amplo (90vw) |
| Precisa scroll para ver tudo | Tudo visivel em uma unica tela |
| Imagem pequena | Imagem grande e destacada |
| Informacoes espremidas | Layout espacado e organizado |

### Arquivo a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/schedule/PostDetails.tsx` | Refatorar para Dialog com layout de duas colunas |

### Estrutura do Componente Atualizado

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="h-[90vh] w-[90vw] max-w-[90vw] p-0">
    <div className="flex h-full">
      {/* Coluna da Imagem - 60% */}
      <div className="relative flex w-3/5 flex-col bg-muted/50">
        {/* Imagem Principal */}
        <div className="relative flex-1">
          <img src={...} className="object-contain" />
          {/* Navegacao */}
          <Button className="absolute left-4">←</Button>
          <Button className="absolute right-4">→</Button>
          <div className="absolute bottom-4">1/4</div>
        </div>
        {/* Thumbnails */}
        <div className="flex gap-2 p-4">
          {images.map(...)}
        </div>
      </div>

      {/* Coluna de Informacoes - 40% */}
      <div className="flex w-2/5 flex-col border-l">
        {/* Header */}
        <div className="border-b p-6">
          <ChannelBadges />
          <h2>{client.name}</h2>
          <PostStatusBadge />
        </div>

        {/* Conteudo com scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Data/Hora */}
          <div className="flex items-center gap-4">
            <Calendar /> {date}
            <Clock /> {time}
          </div>

          {/* Legenda */}
          <div className="mt-6">
            <h4>Legenda</h4>
            <p>{caption}</p>
          </div>

          {/* Status */}
          <div className="mt-6">
            <h4>Alterar Status</h4>
            <Select value={status}>...</Select>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6">
          <Button>Editar</Button>
          <Button>Copiar</Button>
          <Button>Excluir</Button>
        </div>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

### Detalhes de UX para Aprovacao

1. **Badge de status grande e colorido** para facil identificacao
2. **Botao de aprovar rapido** disponivel no seletor de status
3. **Legenda completa visivel** sem precisar clicar em "ver mais"
4. **Navegacao por teclado**: setas para trocar imagem, Esc para fechar
5. **Botao de tela cheia** mantido para visualizacao ainda mais imersiva

### Responsividade

Em telas menores (tablet), o layout pode mudar para:
- Coluna unica com imagem em cima e informacoes embaixo
- Ou manter o Sheet lateral como fallback

```tsx
// Exemplo de classes responsivas
className="flex h-full flex-col lg:flex-row"
className="w-full lg:w-3/5"
className="w-full lg:w-2/5"
```

