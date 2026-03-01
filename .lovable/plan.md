

# Nova rota de Brainstorm

## Banco de dados

Criar tabela `brainstorm_ideas` com:
- `id` (uuid, PK)
- `tenant_id` (uuid, FK para tenants)
- `title` (text, obrigatório)
- `description` (text, nullable)
- `created_by` (uuid, referência ao user)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

RLS: usuários só acessam ideias do próprio tenant.

## Frontend

### 1. Página `src/pages/Brainstorm.tsx`
- Lista de ideias em cards
- Botão "Nova ideia" que abre dialog com campos título e descrição
- Editar/excluir ideias existentes

### 2. Hook `src/hooks/useBrainstormIdeas.ts`
- CRUD usando supabase client + react-query

### 3. Rota em `src/App.tsx`
- Adicionar rota `/brainstorm` com ProtectedRoute + AppLayout

### 4. Menu lateral em `src/components/layout/AppLayout.tsx`
- Adicionar item "Brainstorm" com ícone `Lightbulb` no navItems (visível para todos)

