

# Corrigir auto-save da legenda — debounce e toasts silenciosos

## Problemas identificados

1. **Toast a cada tecla no modal "Expandir legenda"**
   `RichTextEditor` chama `onChange` a cada tecla digitada, e o `onChange` está ligado direto a `handleFieldUpdate('caption', value)`. Como `useUpdatePost` dispara `toast.success('Post atualizado com sucesso!')` em todo `onSuccess`, cada caractere gera um toast.

2. **Toast em todo save inline**
   O mesmo `useUpdatePost` é usado para auto-saves silenciosos (título, legenda, status, cliente, data, canal, SEO…). Cada blur/save mostra "Post atualizado com sucesso!" — ruidoso.

3. **Demora visual / "engasgo" no editor**
   Após salvar, `useUpdatePost.onSuccess` invalida `['posts']`. O `InlineRichTextEditor` tem `useEffect` que chama `editor.commands.setContent(value)` quando `value` externo muda (mesmo sem `isEditing`). Isso reseta o DOM do TipTap a cada save → flash visual.

## Solução

### 1. Tornar o toast opcional em `useUpdatePost` (`src/hooks/usePosts.ts`)
Trocar o toast fixo por um flag controlado pelo chamador:
```ts
mutationFn: async ({ id, post, silent }: { id, post, silent?: boolean }) => { ... },
onSuccess: (_data, vars) => {
  queryClient.invalidateQueries(...);
  if (!vars.silent) toast.success('Post atualizado com sucesso!');
},
onError: (_e, vars) => {
  if (!vars.silent) toast.error('Erro ao atualizar post');
  console.error(...);
},
```
- Manter erro silencioso também (o `InlineRichTextEditor` já reverte o conteúdo no catch). Para casos críticos, adicionar `toast.error` localmente em `handleFieldUpdate`.

### 2. Marcar todos os auto-saves do modal como `silent: true`
Em `GroupPostDetails.tsx` (`handleFieldUpdate` e `handleSharedFieldUpdate`):
```ts
await updatePost.mutateAsync({ id, post: { [field]: value }, silent: true });
```
- Adicionar `try/catch` com `toast.error('Erro ao salvar')` apenas em falha.
- Adicionar **um único** `toast.success` discreto ao final do save da legenda longa (opcional — mais limpo é nenhum toast em auto-save inline e confiar no spinner do `savingField`).

### 3. Debounce no modal expandido de legenda (`captionDialogOpen`)
Substituir o salvamento por tecla por:
- Criar um wrapper local com `useState` para o conteúdo + `useEffect` com `setTimeout(800ms)` (debounce) que dispara `handleFieldUpdate('caption', value)`.
- OU mais simples: remover `onChange` direto e adicionar botão **"Salvar"** + salvar no `onOpenChange(false)` (fechar = salvar).

Prefiro **debounce de 800ms + sem toast** (já é silent), porque preserva a sensação de auto-save sem ruído.

### 4. Evitar reset visual do editor após save
No `InlineRichTextEditor` (`src/components/ui/inline-rich-text-editor.tsx`, linha ~99) e no `RichTextEditor` (linha ~99):
- Mudar a condição do `useEffect` de sync para só sincronizar quando o editor **não está focado** e o valor é realmente diferente do plain text atual:
```ts
useEffect(() => {
  if (!editor) return;
  const isFocused = editor.isFocused;
  const current = editor.getHTML();
  if (!isFocused && value !== current && !isEditing) {
    editor.commands.setContent(value, false); // false = sem emitir update
  }
}, [editor, value, isEditing]);
```
- O `false` em `setContent` evita disparar `onUpdate` em loop.
- No `RichTextEditor` (sem `isEditing`), checar apenas `!editor.isFocused`.

## Arquivos editados
- `src/hooks/usePosts.ts` — flag `silent` em `useUpdatePost`
- `src/components/schedule/GroupPostDetails.tsx` — `silent: true` em handlers + debounce no modal expandido + `toast.error` em catch
- `src/components/ui/inline-rich-text-editor.tsx` — sync só quando editor desfocado, `setContent(value, false)`
- `src/components/ui/rich-text-editor.tsx` — mesma correção de sync

## Resultado esperado
- ✅ Sem toasts por tecla; sem "Post atualizado" piscando dezenas de vezes
- ✅ Indicador de salvamento via `savingField` (já existe) continua mostrando atividade
- ✅ Texto digitado não "salta" / pisca após cada save
- ✅ Modal expandido salva automaticamente após 800ms de inatividade (sem ruído)
- ✅ Erros reais ainda mostram toast (`toast.error` local nos handlers)

