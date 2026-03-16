

# Fix: Status do post não atualiza no /cronogramas

## Problema
Quando o status é alterado no modal `GroupPostDetails`, a mutação invalida as queries e os dados frescos são buscados. Porém, o `selectedGroup` em `Schedule.tsx` é um **snapshot estático** definido no momento do clique — ele nunca se atualiza com os dados novos. O modal continua exibindo o status antigo.

## Solução
Em `Schedule.tsx`, armazenar apenas o `groupId` selecionado (em vez do objeto `PostGroup` inteiro). Derivar o grupo real a partir dos dados frescos de `posts` e `backlogPosts` usando `useMemo`. Assim, quando as queries são invalidadas e os dados atualizam, o grupo exibido no modal também atualiza automaticamente.

## Mudanças

### `src/pages/Schedule.tsx`
- Substituir `selectedGroup: PostGroup | null` por `selectedGroupId: string | null`
- Adicionar `useMemo` que busca o grupo correspondente ao `selectedGroupId` a partir dos posts agrupados (usando `groupPosts` de `useGroupedPosts`)
- No `handlePostClick`, salvar `group.groupId` em vez do objeto inteiro
- Passar o grupo derivado (sempre fresco) para `GroupPostDetails`

