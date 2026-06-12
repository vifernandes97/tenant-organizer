## Objetivo

Permitir que o owner defina **papéis reutilizáveis** (ex.: Editor, Revisor, Visualizador) com permissões granulares (ver, criar, editar, excluir) por feature, e atribua a membros existentes ou a convites futuros. Escopo global por membro — vale para todos os clientes a que ele já tem acesso.

## Features cobertas e permissões

| Feature | view | create | edit | delete |
|---|---|---|---|---|
| `clients` (dados do cliente: persona, canais, contato, etc.) | ✓ | — | ✓ | — |
| `posts` (criar/editar/excluir posts no cronograma) | ✓ | ✓ | ✓ | ✓ |
| `post_status` (mudar status — aprovar/revisar/publicar) | — | — | ✓ | — |
| `brainstorm` (ideias) | ✓ | ✓ | ✓ | ✓ |

Owner sempre tem todas as permissões implicitamente — não passa pelo sistema de papéis.

## Modelo de dados

Novas tabelas (RLS por `tenant_id`):

- `roles` — papéis criados por tenant + 3 papéis padrão semeados por tenant na criação (Editor, Revisor, Visualizador). Colunas: `id`, `tenant_id`, `name`, `description`, `is_system` (bloqueia exclusão dos padrões), timestamps.
- `role_permissions` — permissões por papel. Colunas: `id`, `role_id`, `feature` (enum: `clients`/`posts`/`post_status`/`brainstorm`), `action` (enum: `view`/`create`/`edit`/`delete`), unique(role_id, feature, action).
- Em `user_roles`: adicionar coluna `custom_role_id uuid` (nullable, FK → `roles.id`). Owner continua como `app_role='owner'`; membros têm `app_role='member'` + um `custom_role_id`.
- Em `invitations`: adicionar `custom_role_id` para o convite carregar o papel; ao aceitar, `accept_invitation` grava em `user_roles`.

Papéis padrão semeados:
- **Editor**: tudo em `posts` + `brainstorm` + view em `clients`.
- **Revisor**: view em `clients` e `posts`; edit em `post_status`; view+create em `brainstorm`.
- **Visualizador**: só view em `clients`, `posts`, `brainstorm`.

## Lógica de checagem

Função SECURITY DEFINER `has_permission(_user_id, _feature, _action) returns boolean`:
- retorna `true` se for owner;
- senão, faz join `user_roles → roles → role_permissions` no tenant do usuário.

Usada tanto em RLS no Postgres quanto exposta ao frontend via hook React.

## Mudanças em RLS

- `clients`: SELECT/UPDATE passam a exigir `has_role(owner)` OU (`has_client_access` AND `has_permission('clients','view'|'edit')`).
- `posts`: separar políticas por ação. INSERT exige `has_permission('posts','create')`; UPDATE exige `'posts','edit'` (e `'post_status','edit'` se a coluna mudada for `status` — vamos simplificar: edit em `posts` já cobre tudo; `post_status` é uma permissão adicional que o front usa para mostrar/ocultar o controle de status, e UPDATE no banco verifica `posts.edit OR post_status.edit`); DELETE exige `'posts','delete'`. Sempre combinado com `has_client_access`.
- `brainstorm_ideas`: idem (`view/create/edit/delete`).
- `user_client_access` continua obrigatório para isolar quais clientes o membro enxerga.

## Frontend

1. **Hook `usePermissions()`** que retorna `{ can(feature, action) }` baseado no papel do usuário logado (uma query única em login).
2. **Sidebar**: itens condicionais — esconde "Clientes" se sem `clients.view`; esconde "Brainstorm" se sem `brainstorm.view`.
3. **ProtectedRoute**: substitui `requireOwner` por `requirePermission={{ feature, action }}` (mantém compat).
4. **UI por ação**:
   - Botões "Novo cliente", "Editar cliente", "Excluir" só renderizam se houver a permissão correspondente.
   - No cronograma: botões Novo post, editar inline, excluir respeitam `posts.*`. Dropdown de status respeita `post_status.edit`.
   - Brainstorm: idem.
5. **Configurações → Papéis e permissões** (nova aba para owner):
   - Lista os papéis (3 padrões + customizados).
   - Botão "Novo papel" abre dialog: nome, descrição, matriz checkbox features × ações.
   - Editar/excluir papéis customizados (sistema bloqueia exclusão dos padrão).
6. **Configurações → Equipe** (ajustes):
   - Cada membro mostra um Select com o papel atual. Trocar grava direto em `user_roles.custom_role_id`.
   - Permissões de cliente (já existentes) continuam num botão separado.
7. **Convites** (`InviteDialog`):
   - Adiciona um Select obrigatório de papel ao lado da escolha de clientes.
   - O papel é gravado em `invitations.custom_role_id` e propagado ao aceitar.
8. **Migração de membros existentes**: ao rodar a migração, todo `user_roles` com `role='member'` e `custom_role_id IS NULL` recebe o papel "Editor" como padrão (preserva o comportamento atual onde membros podem tudo dentro dos clientes liberados). Owner pode reatribuir depois.

## Compatibilidade

- `requireOwner` em `/clientes` é substituído por `requirePermission={feature:'clients', action:'view'}`. Membros sem o papel certo continuam sendo redirecionados para o Dashboard.
- A página Configurações continua acessível a todos; abas internas (Papéis, Equipe) já são restritas a owner.

## Entregáveis

1. Migração com: novas tabelas, enums, função `has_permission`, novas policies de `clients`/`posts`/`brainstorm_ideas`, coluna em `user_roles` e `invitations`, seed dos 3 papéis para cada tenant existente, atualização do `accept_invitation` e do `create_tenant_with_owner` (semear papéis padrão).
2. Hook `usePermissions` + `useRoles` (CRUD).
3. Componentes: `RolesList`, `RoleEditorDialog`, ajustes em `TeamList`, `InviteDialog`, `MemberPermissionsDialog`, `AppSidebar`, `ProtectedRoute`.
4. Aplicação de `can(...)` nos botões/menus de Clients, Schedule, Brainstorm.
5. Atualização das memórias de Access Control e User Invitations.
