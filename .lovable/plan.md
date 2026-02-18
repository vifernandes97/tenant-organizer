
# Tornar o titulo um campo compartilhado entre todos os canais do grupo

## Problema

Atualmente, o campo "Titulo" no `GroupPostDetails` usa `handleFieldUpdate`, que atualiza apenas o post do canal ativo. Isso obriga o usuario a editar o titulo em cada canal separadamente.

## Solucao

Duas alteracoes simples:

### 1. `src/components/schedule/GroupPostDetails.tsx`

- Alterar a chamada do campo titulo de `handleFieldUpdate('title', value)` para `handleSharedFieldUpdate('title', value)` (igual ao que ja e feito para `client_id` e `scheduled_at`)
- Atualizar a tipagem de `handleSharedFieldUpdate` para aceitar `'title'` alem de `'client_id' | 'scheduled_at'`

### 2. Nenhuma outra alteracao necessaria

O `PostDetails.tsx` (post individual sem grupo) nao precisa de mudanca pois nao tem multiplos canais.

## Secao tecnica

Alterar a assinatura de `handleSharedFieldUpdate`:

```typescript
const handleSharedFieldUpdate = async (field: 'client_id' | 'scheduled_at' | 'title', value: string) => {
```

E no campo titulo, trocar:

```tsx
onSave={(value) => isMultiChannel ? handleSharedFieldUpdate('title', value) : handleFieldUpdate('title', value)}
```

Isso garante que ao editar o titulo em um grupo multi-canal, todos os posts do grupo recebem o mesmo titulo. Para posts individuais (sem grupo), continua atualizando normalmente.
