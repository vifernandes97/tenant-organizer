

# Remover coluna de horário da visualização em Lista

## Mudança
Retirar a coluna de horário (`HH:mm`) que aparece à esquerda de cada linha na visualização em Lista do cronograma. O horário continua disponível no `PostHoverPreview` (ao passar o mouse) e no modal de detalhes.

## Arquivo editado
- `src/components/schedule/ScheduleListView.tsx` — remover a `<div>` com a classe `w-12 shrink-0 font-mono ...` que renderiza `{time}` (linhas ~120-121) e a constante `time` calculada logo acima (linha ~114).

## Notas
- Sem mudanças em hooks, schema ou outros componentes
- O agrupamento por dia e a ordenação cronológica continuam funcionando normalmente
- Ganho de espaço horizontal para título e cliente

