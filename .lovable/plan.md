
## Visualizacao em Tela Cheia: Imagens e Editor de Legenda

### Problema
Atualmente o modal PostDetails exibe imagens e legendas em um espaco limitado. O usuario deseja poder expandir para tela cheia para melhor visualizacao e edicao.

### Solucao Proposta
Adicionar um modo de tela cheia (fullscreen) acessivel a partir do modal PostDetails, que permitira:
1. Visualizar as imagens em tamanho grande
2. Editar a legenda em um espaco mais amplo
3. Navegar entre imagens no modo fullscreen

### Componentes Envolvidos

**Novo componente:** `src/components/schedule/FullscreenViewer.tsx`
- Modal de tela cheia usando Dialog com classes para ocupar toda a viewport
- Layout dividido: imagem principal a esquerda, editor de legenda a direita
- Navegacao entre imagens (setas e thumbnails)
- Contador de caracteres para a legenda
- Botao para fechar e salvar

**Modificacao:** `src/components/schedule/PostDetails.tsx`
- Adicionar botao "Tela Cheia" / icone Maximize na area da imagem
- Estado para controlar abertura do FullscreenViewer
- Passar dados do post para o novo componente

### Layout Proposto

```text
┌─────────────────────────────────────────────────────────────────┐
│  [X]                    TELA CHEIA                              │
├───────────────────────────────────┬─────────────────────────────┤
│                                   │  Legenda                    │
│                                   │  ┌───────────────────────┐  │
│     [<]     IMAGEM      [>]       │  │                       │  │
│                                   │  │   Editor de texto     │  │
│             PRINCIPAL             │  │   com contador        │  │
│                                   │  │                       │  │
│                                   │  └───────────────────────┘  │
│                                   │  0/2200 caracteres          │
├───────────────────────────────────┴─────────────────────────────┤
│  [thumb1] [thumb2] [thumb3]           [Cancelar] [Salvar]       │
└─────────────────────────────────────────────────────────────────┘
```

### Detalhes Tecnicos

**FullscreenViewer.tsx:**
```tsx
interface FullscreenViewerProps {
  post: PostWithImages;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (caption: string) => void;
}
```

- Usar `Dialog` com `className="fixed inset-0 max-w-full w-screen h-screen"`
- Imagem com `object-contain` para mostrar completa
- Textarea com resize para legenda
- Navegacao com ArrowLeft/ArrowRight (teclado) e botoes visuais
- Hook `useUpdatePost` para salvar alteracoes na legenda

**PostDetails.tsx:**
- Adicionar import do `Maximize` icon do lucide-react
- Estado `fullscreenOpen` para controlar o viewer
- Botao sobreposto na imagem para abrir fullscreen
- Passar callback `onSave` para atualizar a legenda e refetch dos dados

### Arquivos a Criar/Modificar
1. **Criar:** `src/components/schedule/FullscreenViewer.tsx` - novo componente
2. **Modificar:** `src/components/schedule/PostDetails.tsx` - adicionar botao e integracao

### Fluxo de Uso
1. Usuario abre PostDetails (Sheet lateral)
2. Clica no icone de tela cheia na imagem
3. Abre modal fullscreen com imagem grande e editor de legenda
4. Edita legenda se desejar
5. Salva ou cancela
6. Retorna ao PostDetails atualizado
