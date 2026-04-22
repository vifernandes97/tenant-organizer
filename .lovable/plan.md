

# Fix: limite de 2200 caracteres bloqueando edição de legendas

## Problema
A imagem mostra `Legenda 5215/2200` com `Máximo 2200 caracteres` em vermelho — o usuário conseguiu colar 5215 caracteres num ponto, mas o `FullscreenViewer` (visualização em tela cheia ao clicar no botão de expandir da imagem) está limitando a edição a 2200 e impedindo o salvamento. Há também um contador `/2200` no `PostForm` que mostra o número errado no label, mesmo o campo aceitando 5000.

O limite real do projeto é **5000 caracteres** (definido no `RichTextEditor` e `ExpandableTextarea`). O 2200 é o limite específico do **Instagram**, que estava sendo aplicado de forma global por engano.

## Correções

### 1. `src/components/schedule/FullscreenViewer.tsx`
- Trocar `const maxChars = 2200` por `const maxChars = 5000`
- O `<Textarea maxLength={maxChars}>` e o contador `{caption.length}/{maxChars}` passam a usar 5000 automaticamente

### 2. `src/components/schedule/PostForm.tsx` (linha 458)
- Trocar `{field.value?.length || 0}/2200` por `{field.value?.length || 0}/5000`
- Mantém consistência com o `maxLength={5000}` real do `ExpandableTextarea` logo abaixo

## Notas técnicas
- Não há nenhum outro ponto no código que aplique 2200 como limite — verificado com `rg "2200"` em todo `src/`
- A regra de 5000 caracteres já está documentada na memória do projeto (`mem://features/rich-text-editor`)
- Sem mudanças de schema, hooks, ou validação Zod — é apenas correção de constantes hardcoded

## Sugestão futura (não incluída neste fix)
Se quiser indicar limites por canal (Instagram 2200, Twitter 280, LinkedIn 3000, etc.), podemos adicionar contadores informativos por canal selecionado no `PostForm` — mas como **aviso** e não bloqueio, mantendo o limite técnico em 5000.

