

## Adicionar Videos e Campos WordPress

### Visao Geral

Permitir upload de videos alem de imagens nas postagens, e adicionar campos especificos para o canal WordPress (titulo do artigo, palavra-chave SEO, texto do artigo, tipo de projeto e alt text das imagens).

### Arquitetura da Solucao

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     MUDANCAS NECESSARIAS                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. BANCO DE DADOS                                                  │
│     ├─ Renomear/Estender post_images para post_media               │
│     │   └─ Adicionar: media_type (image/video), alt_text           │
│     └─ Adicionar colunas na tabela posts:                          │
│         ├─ article_title (text) - Titulo do artigo WordPress       │
│         ├─ seo_keyword (text) - Palavra-chave SEO                  │
│         ├─ article_content (text) - Texto do artigo (longo)        │
│         └─ project_type (enum) - Tipo de projeto                   │
│                                                                     │
│  2. STORAGE                                                         │
│     └─ Aceitar videos no bucket post-images (ou criar novo bucket) │
│                                                                     │
│  3. COMPONENTES                                                     │
│     ├─ ImageUploader → MediaUploader (aceitar videos)              │
│     ├─ GroupPostDetails - mostrar campos WordPress na aba          │
│     ├─ PostForm - permitir upload de videos                        │
│     └─ Novo: MediaViewer (player de video/imagem)                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1. Mudancas no Banco de Dados

**Novas colunas na tabela `posts` (campos WordPress):**

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| article_title | text (nullable) | Titulo do artigo para WordPress |
| seo_keyword | text (nullable) | Palavra-chave principal para SEO |
| article_content | text (nullable) | Corpo do artigo (texto longo) |
| project_type | enum (nullable) | Tipo de projeto |

**Novo enum `project_type`:**

| Valor | Label |
|-------|-------|
| ete | ETE |
| eta | ETA |
| osmose_reversa | Osmose Reversa |
| ultrafiltracao | Ultrafiltracao |
| fisico_quimico | Fisico Quimico |
| mbr | MBR |

**Novas colunas na tabela `post_images`:**

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| media_type | text | 'image' ou 'video' (default: 'image') |
| alt_text | text (nullable) | Texto alternativo da imagem |

### 2. Migracao SQL

```sql
-- Criar enum para tipo de projeto
CREATE TYPE project_type AS ENUM (
  'ete', 
  'eta', 
  'osmose_reversa', 
  'ultrafiltracao', 
  'fisico_quimico', 
  'mbr'
);

-- Adicionar colunas WordPress na tabela posts
ALTER TABLE posts
ADD COLUMN article_title text,
ADD COLUMN seo_keyword text,
ADD COLUMN article_content text,
ADD COLUMN project_type project_type;

-- Adicionar colunas de midia na tabela post_images
ALTER TABLE post_images
ADD COLUMN media_type text NOT NULL DEFAULT 'image',
ADD COLUMN alt_text text;
```

### 3. Componente MediaUploader

Atualizar `ImageUploader.tsx` para aceitar videos:

```tsx
// Mudancas principais:
// - accept="image/*,video/*"
// - Validacao de tipo (image ou video)
// - Preview diferente para videos (thumbnail ou icone)
// - Limite de tamanho maior para videos (50MB)

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
```

### 4. Campos WordPress no Modal

Quando o canal ativo for WordPress, mostrar campos adicionais:

```text
┌──────────────────────────────────────────────────────────────┐
│                   MODAL - ABA WORDPRESS                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Titulo do Artigo: [_____________________________]          │
│                                                              │
│  Palavra-chave SEO: [___________________________]           │
│                                                              │
│  Tipo de Projeto: [▼ Selecione...]                          │
│    - ETE                                                     │
│    - ETA                                                     │
│    - Osmose Reversa                                          │
│    - Ultrafiltracao                                          │
│    - Fisico Quimico                                          │
│    - MBR                                                     │
│                                                              │
│  Texto do Artigo:                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  │  (Editor de texto rico grande)                          ││
│  │                                                         ││
│  │                                                         ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ─────────────────────────────────────────                   │
│                                                              │
│  Legenda (Caption): [...] (campo ja existente)              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 5. Alt Text nas Imagens

Adicionar campo de alt text editavel para cada imagem/video:

```text
┌──────────────────────────────────────┐
│  [IMG]  ╳                            │
│                                      │
│  Alt: [Descricao da imagem...]      │  ← Campo editavel
└──────────────────────────────────────┘
```

### 6. Player de Video

Para midias do tipo video, usar elemento `<video>` em vez de `<img>`:

```tsx
{media.media_type === 'video' ? (
  <video 
    src={media.url} 
    controls 
    className="h-full w-full object-cover"
  />
) : (
  <img 
    src={media.url} 
    alt={media.alt_text || ''} 
    className="h-full w-full object-cover"
  />
)}
```

### Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| **Migracao SQL** | Criar - adicionar colunas e enum |
| `src/components/schedule/ImageUploader.tsx` | Modificar - aceitar videos |
| `src/components/schedule/GroupPostDetails.tsx` | Modificar - campos WordPress |
| `src/hooks/usePosts.ts` | Modificar - incluir novos campos |
| `src/components/schedule/PostForm.tsx` | Modificar - suporte a video |
| `src/components/schedule/FullscreenViewer.tsx` | Modificar - player de video |
| `src/components/comments/ImageCommentLayer.tsx` | Verificar compatibilidade |

### Fluxo de Upload de Video

```text
Usuario seleciona arquivo
        │
        ▼
┌───────────────────────────┐
│ Validar tipo de arquivo   │
│ - imagem: max 10MB        │
│ - video: max 50MB         │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ Determinar media_type     │
│ 'image' ou 'video'        │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ Upload para Storage       │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ Salvar em post_images     │
│ com media_type correto    │
└───────────────────────────┘
```

### Tipos Atualizados

```typescript
// usePosts.ts
export type PostWithImages = Post & {
  post_images: (PostImage & {
    media_type: 'image' | 'video';
    alt_text: string | null;
  })[];
  clients?: { name: string } | null;
};

// Campos WordPress (apenas para canal wordpress)
interface WordPressFields {
  article_title?: string;
  seo_keyword?: string;
  article_content?: string;
  project_type?: 'ete' | 'eta' | 'osmose_reversa' | 'ultrafiltracao' | 'fisico_quimico' | 'mbr';
}
```

### Consideracoes de UX

- Videos terao icone diferente no thumbnail
- Player de video com controles (play, pause, volume)
- Campos WordPress so aparecem quando canal WordPress esta ativo
- Alt text e opcional mas recomendado para SEO/acessibilidade
- Artigo do WordPress usa editor rico (mesmo do caption)
- Limite maior para videos (50MB vs 10MB imagens)

### Sequencia de Implementacao

1. Criar migracao SQL (enum project_type, colunas posts e post_images)
2. Atualizar tipos TypeScript
3. Modificar ImageUploader para aceitar videos
4. Adicionar campos WordPress no GroupPostDetails
5. Atualizar usePosts para salvar/carregar novos campos
6. Implementar alt text editavel nas midias
7. Atualizar viewers para reproduzir videos

