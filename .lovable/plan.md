

## Ajustes para Usuários Convidados (Members)

### Análise do Estado Atual

#### ✅ Métricas do Dashboard - JÁ FUNCIONAM CORRETAMENTE

As políticas RLS nas tabelas `posts` e `clients` já restringem os dados automaticamente:

| Tabela | Política RLS |
|--------|--------------|
| `posts` | `has_role('owner') OR has_client_access(auth.uid(), client_id)` |
| `clients` | `has_role('owner') OR has_client_access(auth.uid(), id)` |

O Dashboard faz queries simples sem filtro explícito (linhas 32-49 do Dashboard.tsx), mas o RLS no banco já:
- Filtra clientes automaticamente para mostrar apenas os que o member tem acesso
- Filtra posts automaticamente, mostrando apenas posts de clientes permitidos

**Nenhuma mudança necessária no Dashboard** - as métricas já respeitam os acessos.

---

#### ❌ Acesso à Aba de Clientes - PRECISA SER RESTRITO

Atualmente, o menu lateral (AppLayout.tsx, linhas 30-35) mostra a mesma navegação para todos:

```text
┌─────────────────┐
│ Dashboard       │
│ Clientes        │  ← Deve ser ocultado para members
│ Cronogramas     │
│ Configurações   │
└─────────────────┘
```

---

### Mudanças Necessárias

#### 1. Ocultar Menu "Clientes" para Members

**Arquivo:** `src/components/layout/AppLayout.tsx`

Alterar a lista de navegação para considerar o role do usuário:

```tsx
// Antes (estático)
const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  ...
];

// Depois (dinâmico)
const { userRole } = useAuth();
const isOwner = userRole?.role === 'owner';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ...(isOwner ? [{ href: '/clientes', label: 'Clientes', icon: Users }] : []),
  { href: '/cronogramas', label: 'Cronogramas', icon: CalendarDays },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];
```

#### 2. Ocultar Links de Clientes no Dashboard para Members

**Arquivo:** `src/pages/Dashboard.tsx`

Remover o botão "Ver Clientes" e o link "Gerenciar Clientes" do acesso rápido para members:

```tsx
const { userRole } = useAuth();
const isOwner = userRole?.role === 'owner';

// No cabeçalho
<div className="flex gap-3">
  {isOwner && (
    <Button asChild variant="outline">
      <Link to="/clientes">
        <Users className="mr-2 h-4 w-4" />
        Ver Clientes
      </Link>
    </Button>
  )}
  <Button asChild>
    <Link to="/cronogramas">
      <Plus className="mr-2 h-4 w-4" />
      Nova Postagem
    </Link>
  </Button>
</div>

// Na seção de acesso rápido
{isOwner && (
  <Button variant="ghost" className="justify-between" asChild>
    <Link to="/clientes">
      <span className="flex items-center gap-2">
        <Users className="h-4 w-4" />
        Gerenciar Clientes
      </span>
      <ArrowRight className="h-4 w-4" />
    </Link>
  </Button>
)}
```

#### 3. Proteger Rota /clientes para Owners

**Arquivo:** `src/App.tsx`

Criar proteção de rota para owners:

```tsx
<Route
  path="/clientes"
  element={
    <ProtectedRoute requireOwner>
      <AppLayout>
        <Clients />
      </AppLayout>
    </ProtectedRoute>
  }
/>
```

**Arquivo:** `src/components/auth/ProtectedRoute.tsx`

Adicionar prop `requireOwner`:

```tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOwner?: boolean;
}

export function ProtectedRoute({ children, requireOwner = false }: ProtectedRouteProps) {
  const { user, isLoading, profile, profileNotFound, userRole } = useAuth();
  
  // ... loading checks ...

  // Check owner requirement
  if (requireOwner && userRole?.role !== 'owner') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
```

---

### Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| `src/components/layout/AppLayout.tsx` | Filtrar menu baseado no role |
| `src/pages/Dashboard.tsx` | Ocultar links para clientes se não for owner |
| `src/components/auth/ProtectedRoute.tsx` | Adicionar suporte a `requireOwner` |
| `src/App.tsx` | Usar `requireOwner` na rota `/clientes` |

---

### Experiência do Member Após Ajustes

```text
┌─────────────────┐
│ Dashboard       │  ✓ Métricas filtradas por RLS
│ Cronogramas     │  ✓ Apenas posts de clientes permitidos
│ Configurações   │  ✓ Acesso normal
└─────────────────┘
    (sem Clientes)
```

- Members não veem e não acessam a página de gerenciamento de clientes
- Members continuam vendo as métricas corretas baseadas em seus acessos
- A segurança é garantida tanto no frontend (UX) quanto no backend (RLS)

