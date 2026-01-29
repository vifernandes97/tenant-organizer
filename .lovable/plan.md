

## Sistema de Comentarios nas Imagens Estilo Figma

### Visao Geral

Implementar um sistema de comentarios diretamente sobre as imagens do post, similar ao Figma, onde usuarios podem clicar em qualquer ponto da imagem para adicionar um comentario. Alem disso, o painel lateral tera uma aba "Comentarios" mostrando todos os comentarios em formato de lista com status (aberto/resolvido).

### UX Proposta

**Na Imagem:**
```text
┌─────────────────────────────────────────────┐
│                                             │
│    ┌──┐                                     │
│    │1 │  ← Pin com numero                   │
│    └──┘                                     │
│                        ┌──┐                 │
│                        │2 │                 │
│                        └──┘                 │
│          ┌──┐                               │
│          │3 │  (verde = resolvido)          │
│          └──┘                               │
│                                             │
│   + Clique para adicionar comentario        │
└─────────────────────────────────────────────┘
```

**No Painel Lateral - Aba Comentarios:**
```text
┌─────────────────────────────────────────────┐
│  [Detalhes]  [Comentarios (3)]              │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ #1 · Imagem 1 · Aberto              │    │
│  │ "Ajustar contraste dessa area"      │    │
│  │ João · há 2 horas                   │    │
│  │ [Responder] [Resolver]              │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ #2 · Imagem 1 · Resolvido           │    │
│  │ "Trocar fonte do texto"             │    │
│  │ Maria · há 1 dia                    │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

### Arquitetura de Dados

**Nova Tabela: `post_comments`**

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| post_id | uuid | FK para posts |
| image_id | uuid (nullable) | FK para post_images (null = comentario geral) |
| tenant_id | uuid | Para RLS multi-tenant |
| author_id | uuid | Usuario que criou |
| content | text | Texto do comentario |
| x_position | decimal | Posicao X em % (0-100) |
| y_position | decimal | Posicao Y em % (0-100) |
| status | enum | 'open' ou 'resolved' |
| resolved_by | uuid (nullable) | Quem resolveu |
| resolved_at | timestamptz (nullable) | Quando resolveu |
| parent_id | uuid (nullable) | Para threads/respostas |
| created_at | timestamptz | Data de criacao |
| updated_at | timestamptz | Ultima atualizacao |

**Novo Enum: `comment_status`**
- open
- resolved

### Componentes a Criar

| Componente | Proposito |
|------------|-----------|
| `ImageCommentLayer.tsx` | Overlay sobre a imagem com pins clicaveis |
| `CommentPin.tsx` | Pin visual numerado com tooltip |
| `CommentPopover.tsx` | Popover ao clicar no pin para ver/editar |
| `CommentsList.tsx` | Lista de comentarios para a aba lateral |
| `CommentItem.tsx` | Card individual de comentario |
| `CommentForm.tsx` | Form para criar/responder comentario |

### Componentes a Modificar

| Componente | Mudanca |
|------------|---------|
| `PostDetails.tsx` | Adicionar Tabs (Detalhes/Comentarios) no painel direito + overlay na imagem |
| `usePosts.ts` | Adicionar tipagem PostComment |

### Hook a Criar

**`useComments.ts`**
- `useComments(postId)` - Lista comentarios do post
- `useCreateComment()` - Cria novo comentario
- `useUpdateComment()` - Atualiza comentario
- `useResolveComment()` - Marca como resolvido
- `useDeleteComment()` - Remove comentario

### Fluxo de Interacao

**Adicionar Comentario:**
1. Usuario clica em ponto da imagem
2. Popover abre com textarea
3. Usuario digita e clica "Adicionar"
4. Pin aparece na posicao com numero sequencial
5. Comentario aparece na lista lateral

**Visualizar Comentario:**
1. Usuario clica no pin OU no item da lista
2. Pin fica destacado + popover abre com detalhes
3. Pode responder ou marcar como resolvido

**Resolver Comentario:**
1. Usuario clica "Resolver" no popover ou lista
2. Status muda para 'resolved'
3. Pin fica verde
4. Mostra quem e quando resolveu

### Layout do PostDetails Atualizado

```text
┌──────────────────────────────────────────────────────────────┐
│  IMAGEM (60%)                    │  PAINEL LATERAL (40%)    │
│  ┌──────────────────────────────┐│  ┌──────────────────────┐│
│  │                              ││  │[Detalhes][Comentarios]│
│  │   [1]        [2]             ││  ├──────────────────────┤│
│  │         [3]                  ││  │                      ││
│  │                              ││  │ (conteudo da aba     ││
│  │                              ││  │  selecionada)        ││
│  │                              ││  │                      ││
│  └──────────────────────────────┘│  │                      ││
│  [Thumbnails]                    │  └──────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### Secao Tecnica

**Migracao SQL:**

```sql
-- Enum para status do comentario
CREATE TYPE comment_status AS ENUM ('open', 'resolved');

-- Tabela de comentarios
CREATE TABLE post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    image_id UUID REFERENCES post_images(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    x_position DECIMAL(5,2),
    y_position DECIMAL(5,2),
    status comment_status NOT NULL DEFAULT 'open',
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies seguindo padrao existente
```

**Calculo de Posicao:**

```tsx
const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  // Abre form para novo comentario com posicao
  setNewCommentPosition({ x, y });
};
```

**Renderizacao dos Pins:**

```tsx
{comments.map((comment, index) => (
  <CommentPin
    key={comment.id}
    number={index + 1}
    x={comment.x_position}
    y={comment.y_position}
    status={comment.status}
    isActive={activeComment === comment.id}
    onClick={() => setActiveComment(comment.id)}
  />
))}
```

### Sequencia de Implementacao

1. Criar migracao SQL com tabela e RLS policies
2. Criar hook `useComments` com todas as operacoes CRUD
3. Criar componente `CommentPin` (visual do marcador)
4. Criar componente `ImageCommentLayer` (overlay com pins)
5. Criar componente `CommentPopover` (detalhes ao clicar)
6. Criar componente `CommentItem` (item da lista)
7. Criar componente `CommentsList` (aba de comentarios)
8. Atualizar `PostDetails.tsx` com Tabs e integracao
9. Integrar com `FullscreenViewer` (modo visualizacao)

### Estilo dos Pins

| Status | Cor | Comportamento |
|--------|-----|---------------|
| open | Violeta (primary) | Pulsante sutil |
| resolved | Verde | Estatico |
| hover | Escala 1.1x | Tooltip com preview |

### Consideracoes de UX

- Pins sao renderizados com posicao relativa (%) para funcionar em qualquer tamanho de imagem
- Ao trocar de imagem, apenas comentarios daquela imagem sao mostrados na lista
- Comentarios gerais (sem image_id) aparecem sempre
- Filtro na lista: "Todos", "Abertos", "Resolvidos"
- Contador de comentarios na aba: "[Comentarios (5)]"

