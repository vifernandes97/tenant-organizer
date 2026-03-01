

# Adicionar status às ideias do Brainstorm

## Banco de dados

1. Criar enum `brainstorm_idea_status` com valores: `nova`, `dar_sequencia`, `reformular`, `abandonar`
2. Adicionar coluna `status` na tabela `brainstorm_ideas` com default `nova`

## Frontend

### `src/hooks/useBrainstormIdeas.ts`
- Atualizar interface `BrainstormIdea` com campo `status`
- Adicionar mutation `updateIdeaStatus` para alterar só o status

### `src/pages/Brainstorm.tsx`
- Em cada card, exibir badge clicável com o status atual (dropdown para trocar)
- Adicionar filtro por status no topo da página (botões/tabs: Todas, Nova, Dar sequência, Reformular, Abandonar)
- Filtrar a lista localmente com base no status selecionado

### Cores dos badges
- **Nova** — cinza/secondary
- **Dar sequência** — verde
- **Reformular** — amarelo
- **Abandonar** — vermelho/destructive

