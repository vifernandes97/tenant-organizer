

# Exclusão de arquivos de mídia de postagens anteriores a 23/03/2026

## Escopo identificado

- **Usuário**: viniciusfernandesnegocios@gmail.com
- **Tenant**: `2acf7ead-cb63-4883-ac77-4d8fd39cf65c`
- **93 registros** em `post_images` vinculados a **27 postagens** com `scheduled_at < 2026-03-23`
- **68 arquivos únicos** no bucket `post-images` a serem removidos

## Plano de execução

### 1. Criar edge function temporária para deletar arquivos do storage
Uma edge function que:
- Recebe o `tenant_id` e a data limite como parâmetros
- Usa o service role key para listar e deletar os arquivos do bucket `post-images`
- Busca os `image_url` distintos das `post_images` vinculadas a posts antes da data
- Remove os arquivos do storage bucket usando `supabase.storage.from('post-images').remove(paths)`

### 2. Criar migration para deletar os registros do banco
SQL migration que:
- Deleta registros de `post_images` onde o `post_id` pertence a posts do tenant com `scheduled_at < '2026-03-23'`
- Deleta os `post_comments` associados a essas postagens (para não deixar comentários órfãos)

### 3. Executar e limpar
- Deploy da edge function, executá-la via curl
- Deletar a edge function após uso

## Detalhes técnicos

**Edge function** (`cleanup-old-media/index.ts`):
```typescript
// Busca image_urls distintas, remove do bucket, depois deleta registros
const { data: images } = await supabaseAdmin
  .from('post_images')
  .select('image_url, post_id, posts!inner(scheduled_at, tenant_id)')
  .eq('posts.tenant_id', tenantId)
  .lt('posts.scheduled_at', '2026-03-23');

// Remove arquivos do storage
await supabaseAdmin.storage.from('post-images').remove(uniquePaths);
```

**Migration SQL**:
```sql
DELETE FROM post_images 
WHERE post_id IN (
  SELECT id FROM posts 
  WHERE tenant_id = '2acf7ead-cb63-4883-ac77-4d8fd39cf65c' 
  AND scheduled_at < '2026-03-23'
);
```

