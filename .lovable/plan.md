

# Aumentar limite de caracteres da legenda para 5000

## Problema

Atualmente o campo de legenda do post tem um limite de 2200 caracteres, definido em vários arquivos como valor padrão e como prop explícita.

## Solução

Alterar o `maxLength` de `2200` para `5000` em todos os locais relevantes:

### Valores padrão dos componentes (3 arquivos)

1. **`src/components/ui/expandable-textarea.tsx`** (linha 25): `maxLength = 2200` → `maxLength = 5000`
2. **`src/components/ui/rich-text-editor.tsx`** (linha 45): `maxLength = 2200` → `maxLength = 5000`
3. **`src/components/ui/inline-rich-text-editor.tsx`** (linha 60): `maxLength = 2200` → `maxLength = 5000`

### Props explícitas nos formulários (3 arquivos)

4. **`src/components/schedule/PostForm.tsx`** (linha 424): `maxLength={2200}` → `maxLength={5000}`
5. **`src/components/schedule/PostDetails.tsx`** (linha 508): `maxLength={2200}` → `maxLength={5000}`
6. **`src/components/schedule/GroupPostDetails.tsx`** (linha 751): `maxLength={2200}` → `maxLength={5000}`

Nenhuma alteração de banco de dados necessária — a coluna `caption` já é do tipo `text` sem limite de tamanho.

