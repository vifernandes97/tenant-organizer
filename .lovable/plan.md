

## Simplificar Card de Postagem no Calendário

### Objetivo

Simplificar os cards de postagem para exibir apenas:
1. **Título/resumo** gerado por IA
2. **Badge de status**
3. **Indicador de comentários abertos** (quando houver)

### Layout Proposto

```text
┌────────────────────────────┐
│ Fim das LIs e DIs para ... │  ← Título IA
│ ┌──────────┐   💬 2        │  ← Status + Comentários abertos
│ │ Agendado │               │
│ └──────────┘               │
└────────────────────────────┘
```

**Elementos removidos:**
- Thumbnail da imagem
- Ícones de canal
- Nome do cliente
- Horário
- Contagem de canais

---

### Mudanças Técnicas

#### 1. Adicionar Contagem de Comentários Abertos às Postagens

**Arquivo:** `src/hooks/usePosts.ts`

Modificar a query para incluir contagem de comentários abertos:

```tsx
// Na query de posts, adicionar subquery para contar comentários
.from('posts')
.select(`
  *,
  post_images (id, image_url, display_order, media_type, alt_text),
  clients (name),
  open_comments:post_comments(count).eq(status, 'open').is(parent_id, null)
`)
```

**Nota:** Como o Supabase JS não suporta filtros em counts aninhados diretamente, usaremos uma abordagem alternativa - buscar a contagem de comentários separadamente.

**Alternativa mais simples:** Criar um RPC para retornar a contagem ou adicionar ao tipo do post.

**Abordagem escolhida:** Modificar o hook `usePosts` para fazer uma query adicional de contagem de comentários abertos por post_id e mesclar os dados.

#### 2. Atualizar Tipo PostWithImages

**Arquivo:** `src/hooks/usePosts.ts`

```tsx
export type PostWithImages = Post & {
  post_images: (PostImage & { media_type?: string; alt_text?: string | null })[];
  clients?: { name: string } | null;
  open_comments_count?: number;  // Nova propriedade
};
```

#### 3. Atualizar PostGroup

**Arquivo:** `src/hooks/useGroupedPosts.ts`

```tsx
export type PostGroup = {
  groupId: string;
  posts: PostWithImages[];
  clientId: string;
  clientName: string;
  scheduledAt: string;
  title: string | null;
  firstImage: string | null;
  channels: SocialChannel[];
  totalOpenComments: number;  // Soma de todos os posts do grupo
};
```

#### 4. Simplificar GroupedPostCard

**Arquivo:** `src/components/schedule/GroupedPostCard.tsx`

```tsx
export function GroupedPostCard({ group, onClick }: GroupedPostCardProps) {
  const { posts, title, totalOpenComments } = group;
  const primaryPost = posts[0];
  
  // Use AI-generated title if available, otherwise extract from caption
  const displayTitle = title || extractPlainText(primaryPost.caption || '').substring(0, 50);

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-md border bg-card p-2 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
    >
      {/* Título */}
      <p className="truncate text-sm text-foreground font-medium">
        {displayTitle || 'Sem título'}
      </p>
      
      {/* Status + Comentários */}
      <div className="mt-1.5 flex items-center justify-between">
        <PostStatusBadge status={primaryPost.status} showIcon={false} />
        
        {totalOpenComments > 0 && (
          <div className="flex items-center gap-1 text-primary">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{totalOpenComments}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 5. Simplificar PostCard (caso ainda seja usado)

**Arquivo:** `src/components/schedule/PostCard.tsx`

Mesma lógica simplificada do GroupedPostCard.

---

### Estratégia para Contagem de Comentários

Para evitar complexidade, usaremos uma query adicional no `usePosts`:

```tsx
// Após buscar os posts, buscar contagem de comentários
const postIds = posts.map(p => p.id);

const { data: commentCounts } = await supabase
  .from('post_comments')
  .select('post_id')
  .in('post_id', postIds)
  .eq('status', 'open')
  .is('parent_id', null);

// Contar manualmente
const countByPost = new Map<string, number>();
for (const c of commentCounts || []) {
  countByPost.set(c.post_id, (countByPost.get(c.post_id) || 0) + 1);
}

// Mesclar com posts
return posts.map(p => ({
  ...p,
  open_comments_count: countByPost.get(p.id) || 0
}));
```

---

### Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/usePosts.ts` | Adicionar query de contagem de comentários |
| `src/hooks/useGroupedPosts.ts` | Adicionar `totalOpenComments` ao tipo PostGroup |
| `src/components/schedule/GroupedPostCard.tsx` | Simplificar layout: título + status + comentários |
| `src/components/schedule/PostCard.tsx` | Simplificar layout (mesma lógica) |

---

### Resultado Visual

**Antes:**
```text
┌─────────────────────────────────┐
│ [img] 📸 🎬 ICS LOGISTICS       │
│       Fim das LIs e DIs p...    │
│ ┌──────────┐  (2 canais) 07:00  │
│ │ Agendado │                    │
│ └──────────┘                    │
└─────────────────────────────────┘
```

**Depois:**
```text
┌─────────────────────────────────┐
│ Fim das LIs e DIs para projetos │
│ ┌──────────┐          💬 2      │
│ │ Agendado │                    │
│ └──────────┘                    │
└─────────────────────────────────┘
```

Mais limpo, focado na informação essencial, e agora com indicador visual quando há comentários pendentes.

