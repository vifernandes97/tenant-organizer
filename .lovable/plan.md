
# Ocultar aba "Equipe" para membros convidados

## Problema

Membros convidados (role `member`) conseguem ver a aba "Equipe" nas Configuracoes, mas nao deveriam ter acesso a lista de membros da organizacao.

## Solucao

No arquivo `src/pages/Settings.tsx`:

1. Remover a aba "Equipe" do `TabsList` quando o usuario nao for owner
2. Remover o `TabsContent` de "team" para nao-owners
3. Mudar o `defaultValue` das Tabs para "organization" quando nao for owner (ja que a aba "team" nao existira)

## Secao tecnica

### Arquivo: `src/pages/Settings.tsx`

- Condicionar a renderizacao do `TabsTrigger value="team"` com `{isOwner && ...}`
- Condicionar a renderizacao do `TabsContent value="team"` com `{isOwner && ...}`
- Alterar `defaultValue` de `"team"` para `isOwner ? "team" : "organization"`
- Como members nao verao a aba Equipe, o conteudo de TeamList, PendingInvites e InviteDialog tambem ficam inacessiveis

Nenhuma alteracao de banco de dados necessaria - a restricao e puramente de UI, e os dados ja estao protegidos por RLS.
