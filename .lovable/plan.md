## Objetivo
Aumentar o limite do campo **legenda** dos posts de 5.000 para **10.000 caracteres** em toda a aplicação.

## Alterações

1. **Defaults dos componentes de editor** (passa a ser 10000):
   - `src/components/ui/rich-text-editor.tsx` — `maxLength = 10000`
   - `src/components/ui/expandable-textarea.tsx` — `maxLength = 10000`

2. **Telas onde a legenda é editada/exibida** (atualizar valor literal e contador `x/5000`):
   - `src/components/schedule/PostForm.tsx` (linhas 458 e 467)
   - `src/components/schedule/PostDetails.tsx` (linha 520)
   - `src/components/schedule/GroupPostDetails.tsx` (linha 836 — campo legenda; a 653 é do conteúdo do artigo, fica como está em 50.000)
   - `src/components/schedule/FullscreenViewer.tsx` (linha 74 — `maxChars`)

## Observações
- Apenas frontend; nenhuma mudança de schema (a coluna `caption` é `text`, sem limite no banco).
- Atualizar a memória `rich-text-editor` para refletir o novo limite de 10.000.