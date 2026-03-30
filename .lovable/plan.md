

# Fix: Mensagem de erro genérica esconde o erro real de validação

## Problema
Quando o formulário falha na validação (ex: legenda com 3752/2200 caracteres), a função `handleValidationError` exibe sempre a mensagem genérica "Preencha todos os campos obrigatórios", mesmo quando o problema real é outro (como exceder o limite de caracteres). O usuário fica confuso porque todos os campos obrigatórios estão preenchidos.

## Solução
Melhorar `handleValidationError` para exibir a mensagem de erro específica da validação que falhou, em vez de uma mensagem genérica.

## Mudanças

### `src/components/schedule/PostForm.tsx`
- Alterar `handleValidationError` para receber os erros do formulário e exibir a primeira mensagem de erro específica
- Exemplo: se a legenda excede 2200 caracteres, exibir "Máximo 2200 caracteres" em vez de "Preencha todos os campos obrigatórios"

```typescript
const handleValidationError = (errors: any) => {
  // Find the first error message to show
  const firstError = Object.values(errors).find((e: any) => e?.message) as any;
  const message = firstError?.message || 'Preencha todos os campos obrigatórios';
  
  // Switch to content tab if error is there
  if (errors.client_id || errors.channels || errors.channel || errors.scheduled_at || errors.caption) {
    setActiveTab('content');
  }
  
  toast.error(message);
};
```

