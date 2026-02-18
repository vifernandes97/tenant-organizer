

# Corrigir erro ao atualizar titulo do post

## Problema

O erro `PGRST116: The result contains 0 rows` ocorre porque a funcao `useUpdatePost` no arquivo `src/hooks/usePosts.ts` nao mapeia o campo `title` para o objeto de update enviado ao banco.

Na linha 369-374, apenas estes campos sao copiados:
- `client_id`
- `channel`
- `scheduled_at`
- `caption`
- `status`

Quando `handleSharedFieldUpdate('title', value)` e chamado, o `postUpdate` fica vazio `{}`, o update nao altera nenhuma linha, e o `.single()` falha por retornar 0 linhas.

## Solucao

Adicionar o mapeamento do campo `title` no `useUpdatePost` em `src/hooks/usePosts.ts`, logo apos os outros campos:

```typescript
if (post.title !== undefined) postUpdate.title = post.title || null;
```

## Secao tecnica

### Arquivo: `src/hooks/usePosts.ts`

Adicionar na linha ~375 (apos `if (post.status)`):

```typescript
if (post.title !== undefined) postUpdate.title = post.title || null;
```

Tambem sera necessario garantir que `PostEditFormData` (ou `Partial<PostEditFormData>`) inclua `title`. Verificar o schema Zod usado.

Alem disso, quando o titulo e editado manualmente, NAO deve ser sobrescrito pela geracao automatica de titulo por IA (que ocorre quando `caption` muda). O campo `title` manual deve ter prioridade.

### Arquivos alterados

- `src/hooks/usePosts.ts` - adicionar mapeamento de `title` no `postUpdate`

