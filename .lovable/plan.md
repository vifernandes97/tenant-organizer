

## Alterar Status pelo Badge no Modal

### Visao Geral

Transformar o `PostStatusBadge` no header do modal em um componente clicavel que abre um dropdown/popover para alterar o status diretamente, proporcionando uma experiencia mais intuitiva e rapida.

### UX Proposta

**Antes:**
```text
┌─────────────────────────────────────┐
│  [Rascunho]           Cliente XYZ  │  ← Badge estatico
└─────────────────────────────────────┘
```

**Depois:**
```text
┌─────────────────────────────────────┐
│  [Rascunho ▼]         Cliente XYZ  │  ← Badge clicavel
└─────────────────────────────────────┘
         │
         ▼
    ┌──────────────┐
    │ ○ Rascunho   │  ← Opcoes de status
    │ ○ Aprovado   │
    │ ○ Agendado   │
    │ ○ Publicado  │
    └──────────────┘
```

### Arquitetura da Solucao

Criar um novo componente `PostStatusDropdown` que:
1. Renderiza o badge atual com indicador de clicavel (cursor pointer + seta ou hover effect)
2. Ao clicar, abre um `DropdownMenu` com todas as opcoes de status
3. Ao selecionar, chama o callback de mudanca de status
4. Mostra feedback visual durante a atualizacao

### Novo Componente: `PostStatusDropdown.tsx`

| Prop | Tipo | Descricao |
|------|------|-----------|
| status | PostStatus | Status atual |
| onStatusChange | (status: PostStatus) => void | Callback ao mudar |
| isLoading | boolean | Indicador de loading |

### Mudancas

| Componente | Mudanca |
|------------|---------|
| `PostStatusDropdown.tsx` | **Criar** - Dropdown com badge clicavel |
| `PostDetails.tsx` | Substituir `PostStatusBadge` por `PostStatusDropdown` no header |

### Implementacao do Dropdown

```tsx
// PostStatusDropdown.tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Loader2 } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Rascunho', icon: FileText },
  { value: 'approved', label: 'Aprovado', icon: Check },
  { value: 'scheduled', label: 'Agendado', icon: Clock },
  { value: 'published', label: 'Publicado', icon: CheckCircle },
];

export function PostStatusDropdown({ status, onStatusChange, isLoading }: Props) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="group inline-flex cursor-pointer items-center">
          <Badge variant={config.variant} className={cn(config.className, 'pr-1.5')}>
            {isLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Icon className="mr-1 h-3 w-3" />}
            {config.label}
            <ChevronDown className="ml-1 h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {STATUS_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onStatusChange(option.value)}
            className={status === option.value ? 'bg-accent' : ''}
          >
            <option.icon className="mr-2 h-4 w-4" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Mudanca no PostDetails

```tsx
// Antes (linha 221)
<PostStatusBadge status={post.status} />

// Depois
<PostStatusDropdown 
  status={post.status} 
  onStatusChange={handleStatusChange}
  isLoading={updateStatus.isPending}
/>
```

### Comportamento

| Acao | Resultado |
|------|-----------|
| Click no badge | Abre dropdown com opcoes |
| Seleciona opcao | Atualiza status + fecha dropdown |
| Durante loading | Badge mostra spinner |
| Opcao atual | Destacada com background accent |

### Consideracoes de UX

- Manter o badge com a mesma aparencia visual (cores, icones)
- Adicionar seta sutil (ChevronDown) para indicar que e clicavel
- Hover effect suave para reforcar interatividade
- Loading state no proprio badge durante atualizacao
- Remover o select "Alterar Status" redundante da aba Detalhes (opcional, pode manter como alternativa)

### Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/schedule/PostStatusDropdown.tsx` | Criar |
| `src/components/schedule/PostDetails.tsx` | Modificar header |

