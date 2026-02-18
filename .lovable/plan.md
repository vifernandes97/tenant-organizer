

# Corrigir reordenacao de imagens

## Problema

As queries em `usePosts.ts` buscam `post_images` sem ordenar por `display_order`. O Supabase ordena relacoes aninhadas pela chave primaria por padrao, entao mesmo apos salvar a nova ordem no banco, os dados refetchados voltam na ordem original.

## Correcao

Adicionar `.order('display_order', { ascending: true, referencedTable: 'post_images' })` nas duas queries que buscam posts:

### `usePosts` (linha ~133)
Apos `.order('scheduled_at', ...)`, adicionar:
```
.order('display_order', { ascending: true, referencedTable: 'post_images' })
```

### `usePost` (linha ~206)
Apos `.single()`, o metodo `.order` precisa ser adicionado antes de `.single()`. Reorganizar para:
```
.eq('id', id)
.order('display_order', { ascending: true, referencedTable: 'post_images' })
.single()
```

## Arquivos alterados
- `src/hooks/usePosts.ts` — duas linhas adicionadas (uma em cada query)

Nenhuma outra alteracao e necessaria. A mutation e o drag and drop ja funcionam corretamente.

