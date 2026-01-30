

## Correção: Feedback de Erro ao Salvar Post

### Problema Identificado
Quando o usuário está na aba "Imagens" e clica em "Salvar", se houver erros de validação em campos da aba "Conteúdo" (ex: cliente, canal, data/hora), o formulário simplesmente não submete e **nenhum feedback** é mostrado porque:

1. Os erros aparecem apenas nos campos específicos na aba "Conteúdo"
2. O usuário está na aba "Imagens" e não vê os erros
3. O `handleSubmit` do react-hook-form silencia quando há erros

### Solução
Adicionar tratamento de erros de validação que:
1. Mostra um toast informando que há campos obrigatórios não preenchidos
2. Muda automaticamente para a aba "Conteúdo" onde os erros estão

### Mudanças em `src/components/schedule/PostForm.tsx`

**1. Transformar `Tabs` em controlada com estado:**
```tsx
const [activeTab, setActiveTab] = useState('content');
```

**2. Criar handler para erros de validação:**
```tsx
const handleValidationError = () => {
  setActiveTab('content');
  toast.error('Preencha todos os campos obrigatórios');
};
```

**3. Atualizar o form submit:**
```tsx
<form 
  onSubmit={activeForm.handleSubmit(onSubmit, handleValidationError)} 
  className="space-y-4"
>
```

**4. Usar Tabs controladas:**
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
```

### Fluxo Corrigido

| Cenario | Antes | Depois |
|---------|-------|--------|
| Salvar na aba Imagens com erros | Nada acontece | Toast aparece + muda para aba Conteúdo |
| Campos obrigatórios vazios | Silencioso | Toast "Preencha todos os campos obrigatórios" |
| Validação OK | Funciona | Funciona (sem mudança) |

### Detalhes Técnicos

O `handleSubmit` do react-hook-form aceita dois callbacks:
```tsx
handleSubmit(onSubmit, onError)
```

O `onError` é chamado quando há erros de validação, recebendo o objeto de erros.

### Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/schedule/PostForm.tsx` | Adicionar estado para tab ativa, handler de erro e toast de feedback |

