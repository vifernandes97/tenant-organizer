

# Remover botões "Esta semana" e "Próx. 30 dias" do cronograma

## Mudança
Retirar os dois atalhos de período (`Esta semana` e `Próx. 30 dias`) da barra de navegação do cronograma. A navegação principal (botões `< >`, toggle Semana/Mês/Lista e clique no label da data para voltar a "hoje") continua funcionando normalmente.

## Arquivo editado
- `src/pages/Schedule.tsx` — remover o bloco JSX dos dois botões (linhas ~228-235) e as funções `goToThisWeek` e `goToNext30Days` que ficam órfãs.

## Notas
- Sem mudanças em hooks, schema ou outros componentes
- O usuário ainda volta para "hoje" clicando no label central da data (`goToToday` já existe)
- Navegação por mês/semana segue via setas `< >`

