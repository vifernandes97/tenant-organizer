

## Alterar Logo da Sidebar para Versão de Fundo Escuro

### Objetivo

Substituir a logo atual na sidebar pela versão otimizada para fundo escuro (com texto branco), mantendo a logo original nas outras páginas como Login.

### Alterações

#### 1. Copiar Nova Imagem para Assets

| Origem | Destino |
|--------|---------|
| `user-uploads://logo-approvee-fundo-escuro.png` | `src/assets/logo-approvee-dark.png` |

#### 2. Atualizar AppLayout.tsx

**Arquivo:** `src/components/layout/AppLayout.tsx`

- Adicionar import da nova logo para fundo escuro
- Substituir a imagem na seção do logo da sidebar

**Mudanças no código:**

```typescript
// Adicionar import
import logoApproveeDark from '@/assets/logo-approvee-dark.png';

// Na linha 77, trocar:
<img src={faviconApprovee} alt="Approvee" className="h-8" />

// Para:
<img src={logoApproveeDark} alt="Approvee" className="h-8" />
```

### Resumo

| Arquivo | Ação |
|---------|------|
| `src/assets/logo-approvee-dark.png` | Criar (copiar da imagem enviada) |
| `src/components/layout/AppLayout.tsx` | Modificar import e src da imagem |

### Resultado

- A sidebar com fundo escuro exibirá a logo com texto branco (legível)
- A página de Login e outras áreas continuarão usando a logo original

