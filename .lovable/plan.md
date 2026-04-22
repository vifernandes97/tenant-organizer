

# Fix: validação Zod ainda bloqueia em 2200 caracteres no save

## Problema
Mesmo após o fix anterior na UI, ao salvar um post o toast **"Máximo 2200 caracteres"** ainda aparece. A causa é que a validação Zod em `src/hooks/usePosts.ts` (que roda no submit do formulário via React Hook Form) tem `max(2200)` hardcoded em **dois schemas**:

- Linha 92 — `postSchema` (criação multi-canal)
- Linha 104 — `postEditSchema` (edição de canal único)

Esses schemas validam o caption antes de qualquer chamada ao banco, então o limite de UI (5000) e o `maxLength` do textarea ficam inertes — o Zod barra antes.

## Correção

### `src/hooks/usePosts.ts`
Trocar nas duas linhas (92 e 104):
```ts
caption: z.string().max(2200, 'Máximo 2200 caracteres').optional(),
```
por:
```ts
caption: z.string().max(5000, 'Máximo 5000 caracteres').optional(),
```

## Notas técnicas
- `rg "2200" src/` confirma que estes são os **únicos** dois pontos restantes no código de aplicação (os outros matches são apenas valores hex `#422006` no Tailwind config — irrelevantes)
- A regra de 5000 caracteres do projeto (memória `mem://features/rich-text-editor`) agora fica refletida em UI **e** validação
- Sem mudanças de schema do banco, hook signature, ou tipos — só os literais Zod

