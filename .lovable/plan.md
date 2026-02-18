
# Permitir alterar o nome exibido do post no calendario

## Resumo

Adicionar um campo editavel de titulo no painel de detalhes do post, antes dos outros campos. O titulo e o texto exibido nos cards do calendario. Atualmente ele e gerado automaticamente por IA, mas o usuario podera sobrescreve-lo manualmente.

## Alteracoes

### 1. `src/components/schedule/PostDetails.tsx`

Adicionar um campo `InlineEditable` do tipo `text` para o titulo, logo no inicio da aba de detalhes (antes do campo "Canal"):

```
Titulo
[campo editavel inline com o valor de post.title]
```

Usara `handleFieldUpdate('title', value)` que ja existe e funciona para qualquer campo.

### 2. `src/components/schedule/GroupPostDetails.tsx`

Mesma logica: adicionar campo de titulo editavel no painel de detalhes do post ativo do grupo. O titulo e individual por canal (cada post do grupo pode ter titulo diferente).

### 3. `src/components/schedule/PostCard.tsx`

Nenhuma alteracao necessaria. O card ja exibe `post.title` e atualizara automaticamente apos a edicao, pois a query e invalidada pelo `useUpdatePost`.

## Secao tecnica

O campo sera adicionado assim no PostDetails:

```tsx
<div className="mb-4">
  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Titulo</h4>
  <InlineEditable
    type="text"
    value={post.title || ''}
    placeholder="Sem titulo"
    onSave={(value) => handleFieldUpdate('title', value)}
    isLoading={savingField === 'title'}
  />
</div>
```

Sera inserido logo acima do campo "Canal" na aba de detalhes.
