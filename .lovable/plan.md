# Status por canal no card do cronograma

## Problema

No `GroupedPostCard` (card de post no calendário/semana), quando um post é multi-canal (mesmo `group_id`, vários `channel`), só é exibido o status do **primeiro** post do grupo (`primaryPost.status`). Resultado: se o WordPress já está "Publicado" mas o LinkedIn ainda está "Agendado", o card mostra apenas "Publicado" — passando a falsa impressão de que tudo já foi para o ar.

A mesma lógica afeta:
- Borda colorida do card (`STATUS_BORDER_CLASS[primaryPost.status]`)
- `PostHoverPreview` (status único)

## Solução

Mostrar **um badge de status por canal** quando o grupo tiver mais de um canal **ou** quando os status divergirem. Quando todos os canais compartilham o mesmo status, manter o badge único atual (sem ruído visual).

### Comportamento por cenário

| Cenário | Badge no card | Borda |
|---|---|---|
| 1 canal | 1 badge (atual) | cor do status atual |
| Multi-canal, todos com mesmo status | 1 badge (atual) | cor do status |
| Multi-canal, status divergentes | 1 mini-badge por canal: `[ícone canal] Status` | cor do "menor" status (ver abaixo) |

### Regra da borda quando status divergem

Definir uma ordem de "progresso de publicação":
`draft → ai_generated → reviewed → approved → scheduled → published`

A borda usa o **status mínimo** do grupo (o mais "atrasado"). Assim, se um canal está "Publicado" e outro "Agendado", a borda fica âmbar (Agendado), comunicando "ainda não terminou". Isso evita o problema atual de "tudo verde quando não está".

### Render dos mini-badges (status por canal)

Em vez de uma linha só com o status, mostrar uma lista compacta:

```
[IG] Publicado
[LI] Agendado
[WP] Publicado
```

- Reaproveitar o ícone do canal de `ChannelBadges` (modo `iconOnly`)
- Reaproveitar a cor/label do status de `PostStatusBadge` (sem ícone, fonte 11px)
- Ordenar pela mesma ordem do array `posts` do grupo (já vem ordenado por canal)
- No `PostHoverPreview`: mesma lista, com labels completas dos canais

### Status customizado por cliente

`PostStatusBadge` já aceita `customStatusId` + `clientId`. Cada post no grupo tem seu próprio `custom_status_id` → passar individualmente para cada mini-badge. Funciona automaticamente.

## Arquivos editados

- **`src/components/schedule/GroupedPostCard.tsx`**
  - Calcular `allSameStatus` (comparar `status` + `custom_status_id` de todos os posts)
  - Calcular `borderStatus` = status mínimo segundo a ordem de progresso
  - Trocar a borda fixa por `STATUS_BORDER_CLASS[borderStatus]`
  - Se `allSameStatus`: renderizar `PostStatusBadge` único (atual). Senão: renderizar lista de mini-badges por canal

- **`src/components/schedule/PostHoverPreview.tsx`**
  - Aceitar prop opcional `posts?: { channel, status, custom_status_id }[]` (passada pelo `GroupedPostCard`)
  - Se `posts` tem >1 status distinto: renderizar lista por canal (ícone + label do canal + badge de status). Senão: manter badge único atual

- **`src/components/schedule/PostCard.tsx`** (card do calendário sem agrupamento)
  - Sem mudança. Esse componente já é por post individual, então um único status faz sentido.

## Notas técnicas

- Não muda nada em hooks, schema ou queries — todos os posts do grupo já vêm com seu próprio `status` e `custom_status_id` em `groupPosts()`
- `STATUS_BORDER_CLASS` em `statusStyles.ts` já cobre todos os status; só mudamos qual é escolhido
- Multi-canal com status idênticos continua visualmente idêntico ao atual (zero regressão para 90% dos casos)
- Componente novo simples para o mini-badge fica inline no `GroupedPostCard` (1 div com ícone + texto colorido pelo status), evitando criar um arquivo só para isso

## Resultado esperado

- Card multi-canal com status divergentes mostra claramente o status de cada canal
- Borda continua refletindo o "pior" status, eliminando o falso "tudo publicado"
- Cards single-channel e cards multi-canal totalmente sincronizados ficam idênticos ao que já são hoje
