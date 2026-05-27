## Problema

O campo **Legenda** tem dois modos:

1. **Editor inline** (`InlineRichTextEditor` em PostDetails e GroupPostDetails) — exige clicar em **Salvar** explicitamente, limite atual de 5.000 caracteres.
2. **Editor expandido** (modal aberto pelo botão "Expandir") — sem botão Salvar, usa salvamento automático (PostDetails dispara save a cada tecla; GroupPostDetails debounce de 800ms via `DebouncedCaptionEditor`). Limite atual de 10.000.

Isso causa a sensação de campos diferentes:
- comportamento de salvar divergente (manual vs. automático)
- limites de caracteres diferentes (5k vs. 10k)
- ao fechar o modal as alterações nem sempre aparecem imediatamente no inline (o editor inline tem estado interno que só sincroniza quando não está em edição)

## O que vou fazer

### 1. Unificar limite em 20.000 caracteres
Atualizar `maxLength`/`maxChars` em todos os pontos relacionados à legenda:
- `src/components/ui/rich-text-editor.tsx` (default)
- `src/components/ui/inline-rich-text-editor.tsx` (default — hoje 5000)
- `src/components/ui/expandable-textarea.tsx` (default)
- `src/components/schedule/PostForm.tsx` (campo legenda + contador exibido)
- `src/components/schedule/PostDetails.tsx` (modal expandido)
- `src/components/schedule/GroupPostDetails.tsx` (modal expandido — campo legenda; o campo "conteúdo do artigo" do WordPress permanece em 50.000)
- `src/components/schedule/FullscreenViewer.tsx` (`maxChars`)

### 2. Unificar comportamento do editor expandido
Trocar o autosave do modal expandido por **Salvar / Cancelar com estado local**, igual ao inline editor:

- **PostDetails**: o `captionDialogOpen` hoje chama `handleFieldUpdate` no `onChange` (salva por tecla). Será refatorado para manter um `tempCaption` local; rodapé com botões **Cancelar** (descarta) e **Salvar** (persiste e fecha). Fechar o modal sem salvar pede confirmação somente se houver alterações pendentes (ou simplesmente descarta — manter simples: descarta).
- **GroupPostDetails**: o `DebouncedCaptionEditor` será substituído pelo mesmo padrão (estado local + botões Salvar/Cancelar). A função `DebouncedCaptionEditor` deixa de ser necessária e é removida.

### 3. Sincronização entre inline e expandido
Após o **Salvar** no modal, a mutação `useUpdatePost` invalida a query de posts e o `InlineRichTextEditor` recebe o novo `value` via prop. O efeito existente (linhas 102–108 de `inline-rich-text-editor.tsx`) já sincroniza quando não está em edição — nenhuma mudança necessária ali. Como o salvamento agora é explícito, o usuário verá a atualização imediatamente ao fechar.

### Escopo fora
- Não altero a coluna `caption` no banco (já é `text`, sem limite).
- Não toco no `FullscreenViewer` além do `maxChars` (ele já tem padrão Salvar/Cancelar correto).
- Não altero o editor de conteúdo do artigo WordPress (continua 50.000).

## Resultado esperado
- Mesmo limite (20.000) e mesmo padrão Salvar/Cancelar em ambos os modos.
- Ao salvar no modal, o conteúdo aparece imediatamente no inline editor.
- Fechar o modal sem salvar descarta alterações (comportamento previsível e idêntico ao "Cancelar" do inline).