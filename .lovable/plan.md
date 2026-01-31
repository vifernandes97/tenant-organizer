

## Agrupamento de Posts Multi-Canal

### Visao Geral

Mudar a regra de negocio para que posts criados para multiplos canais sejam agrupados em uma unica entrada no calendario. Cada canal mantem seu proprio registro no banco (permitindo legendas, comentarios e status independentes), mas a visualizacao e unificada.

### Arquitetura Proposta

```text
┌────────────────────────────────────────────────────────────────────────┐
│                    ESTRUTURA DE DADOS                                  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Antes (atual):                                                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                                │
│  │ Post 1  │  │ Post 2  │  │ Post 3  │    3 posts separados           │
│  │ Insta   │  │ TikTok  │  │ LinkedIn│    no calendario               │
│  └─────────┘  └─────────┘  └─────────┘                                │
│                                                                        │
│  Depois (novo):                                                        │
│  ┌─────────────────────────────────┐                                   │
│  │         Post Agrupado          │      1 card no calendario          │
│  │   group_id: abc-123            │      mostrando multiplos canais    │
│  ├─────────┬─────────┬────────────┤                                    │
│  │ Insta   │ TikTok  │ LinkedIn   │      3 registros no banco          │
│  │ (post1) │ (post2) │ (post3)    │      com mesmo group_id            │
│  └─────────┴─────────┴────────────┘                                    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Mudancas no Banco de Dados

**Nova coluna na tabela `posts`:**

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| group_id | uuid (nullable) | Identifica posts do mesmo agrupamento |

Posts com o mesmo `group_id` pertencem ao mesmo "bloco" de publicacao. Posts individuais (apenas 1 canal) terao `group_id = null`.

### Fluxo de Criacao

```text
Usuario cria post com 3 canais selecionados
                │
                ▼
┌───────────────────────────────┐
│  Gerar UUID para group_id     │
│  (ex: abc-123-def-456)        │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│  Inserir 3 registros:         │
│  - Post Insta (group_id: abc) │
│  - Post TikTok (group_id: abc)│
│  - Post LinkedIn (group_id: abc)│
└───────────────────────────────┘
```

### Fluxo de Exibicao no Calendario

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     AGRUPAMENTO NO FRONTEND                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Query retorna todos os posts do mes                             │
│                                                                     │
│  2. Frontend agrupa por group_id (ou id se null)                    │
│     ┌──────────────────────────────────────────┐                    │
│     │ Map<group_key, PostWithImages[]>          │                    │
│     │ "abc-123" → [post1, post2, post3]        │                    │
│     │ "def-456" → [post4]                      │                    │
│     └──────────────────────────────────────────┘                    │
│                                                                     │
│  3. Para cada grupo, renderiza 1 PostCard                           │
│     exibindo icones de todos os canais                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Novo Card Agrupado

**PostCard atualizado:**

```text
┌─────────────────────────────────────┐
│  [img]  📸 📱 💼  Cliente XYZ       │  ← Multiplos icones de canal
│         Titulo gerado pela IA       │
├─────────────────────────────────────┤
│  [Rascunho]              10:30      │  ← Status do post "principal"
└─────────────────────────────────────┘
```

### Modal de Detalhes com Abas de Canal

```text
┌──────────────────────────────────────────────────────────────┐
│                         MODAL                                 │
├────────────────────────────┬─────────────────────────────────┤
│                            │  [Rascunho ▼]  Cliente XYZ      │
│                            ├─────────────────────────────────┤
│                            │  Canais:                         │
│                            │  ┌───────┬────────┬──────────┐  │
│        IMAGEM              │  │📸Insta│📱TikTok│💼LinkedIn│  │ ← Tabs
│                            │  └───────┴────────┴──────────┘  │
│                            ├─────────────────────────────────┤
│                            │                                 │
│                            │  Legenda: ...                   │
│                            │  (conteudo do canal selecionado)│
│                            │                                 │
│                            │  Status: [Rascunho ▼]           │
│                            │  (status do canal selecionado)  │
│                            │                                 │
└────────────────────────────┴─────────────────────────────────┘
```

### Componentes a Modificar

| Componente | Mudanca |
|------------|---------|
| `usePosts.ts` | Adicionar `group_id` na criacao de posts |
| `ScheduleCalendar.tsx` | Agrupar posts por `group_id` antes de renderizar |
| `PostCard.tsx` | Aceitar array de posts, exibir multiplos canais |
| `PostDetails.tsx` | Receber grupo de posts, adicionar tabs de canais |
| `Schedule.tsx` | Ajustar handlers para trabalhar com grupos |

### Novos Tipos

```typescript
// Grupo de posts (mesmo group_id)
type PostGroup = {
  groupId: string;
  posts: PostWithImages[];
  // Dados compartilhados (do primeiro post do grupo)
  clientId: string;
  clientName: string;
  scheduledAt: string;
  title: string | null;
  firstImage: string | null;
};
```

### Hook Auxiliar para Agrupamento

```typescript
// usePosts.ts
export function useGroupedPosts(posts: PostWithImages[]): PostGroup[] {
  return useMemo(() => {
    const groups = new Map<string, PostWithImages[]>();
    
    posts.forEach(post => {
      const key = post.group_id || post.id; // Posts sem grupo usam proprio ID
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(post);
    });
    
    return Array.from(groups.entries()).map(([groupId, groupPosts]) => ({
      groupId,
      posts: groupPosts,
      clientId: groupPosts[0].client_id,
      clientName: groupPosts[0].clients?.name || '',
      scheduledAt: groupPosts[0].scheduled_at,
      title: groupPosts[0].title,
      firstImage: groupPosts[0].post_images?.[0]?.image_url || null,
    }));
  }, [posts]);
}
```

### Comportamento dos Canais no Modal

| Campo | Comportamento |
|-------|---------------|
| Cliente | Compartilhado (editar afeta todos) |
| Data/Hora | Compartilhada (editar afeta todos) |
| Imagens | Compartilhadas (mesmas para todos os canais) |
| Legenda | Individual por canal |
| Status | Individual por canal |
| Comentarios | Individual por canal/imagem |

### Edicao em Lote (Campos Compartilhados)

Ao editar cliente ou data/hora no modal, o sistema atualiza todos os posts do grupo:

```typescript
const handleSharedFieldUpdate = async (field: 'client_id' | 'scheduled_at', value: string) => {
  // Atualiza todos os posts do grupo
  for (const p of postGroup.posts) {
    await updatePost.mutateAsync({ id: p.id, post: { [field]: value } });
  }
};
```

### Migracao de Dados Existentes

Posts ja criados nao terao `group_id`, o que e tratado como post individual. Nenhuma migracao de dados e necessaria - apenas novos posts criados com multiplos canais terao o agrupamento.

### Sequencia de Implementacao

1. Adicionar coluna `group_id` na tabela `posts` (migracao SQL)
2. Atualizar `useCreatePost` para gerar e usar `group_id`
3. Criar helper `useGroupedPosts` para agrupar no frontend
4. Atualizar `ScheduleCalendar` para usar grupos
5. Atualizar `PostCard` para exibir multiplos canais
6. Atualizar `PostDetails` com tabs de canal
7. Atualizar `Schedule.tsx` para passar grupos ao modal

### Consideracoes

- **Retrocompatibilidade**: Posts existentes sem `group_id` funcionam como individuais
- **Performance**: Agrupamento feito no frontend (dados ja carregados)
- **UX**: Usuario ve um bloco unificado, mas pode gerenciar cada canal separadamente
- **Exclusao**: Excluir um canal remove apenas aquele post do grupo
- **Adicionar Canal**: Pode-se criar novo post com mesmo `group_id` no futuro

