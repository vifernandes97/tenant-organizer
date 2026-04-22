

# Remover KPIs do topo da página de Cronogramas

## Mudança
Retirar os 5 cards de estatísticas (Total, Rascunhos, Aprovados, Agendados, Publicados) do topo de `/cronogramas` para dar foco máximo ao calendário/visualização das postagens.

## Arquivo editado
- `src/pages/Schedule.tsx` — remover o bloco JSX dos stats cards e qualquer cálculo/state usado exclusivamente por eles (ex: `useMemo` que conta posts por status). Filtros, header, seletor de cliente e o calendário permanecem intactos.

## Notas
- Os filtros por status (na barra de filtros) continuam disponíveis — quem quiser filtrar por "Agendados" ou "Publicados" segue usando lá
- Sem alterações em hooks, schema ou outras telas
- Ganho de espaço vertical → calendário aparece imediatamente sem scroll

