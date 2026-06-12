---
name: Roles and granular permissions
description: Reusable per-tenant roles (Editor/Revisor/Visualizador + custom) with view/create/edit/delete permissions per feature (clients, posts, post_status, brainstorm). Applied via has_permission() in RLS and usePermissions() hook in UI.
type: feature
---
- Tables: `roles` (per tenant, `is_system` for the 3 defaults) and `role_permissions` (feature × action).
- `user_roles.custom_role_id` and `invitations.custom_role_id` link a member/convite to a role. Owners bypass everything via `has_role(owner)`.
- DB function `has_permission(user, feature, action)` is the single source of truth; called from RLS on clients, posts (separated by action; UPDATE also accepts `post_status.edit`) and brainstorm_ideas.
- Frontend hook `usePermissions()` returns `can(feature, action)`. Used in `AppLayout` sidebar (hides items), `ProtectedRoute` (`requirePermission` prop replaces `requireOwner` on /clientes, /cronogramas, /brainstorm), and can be applied to any action button.
- Configurações → "Papéis e permissões" tab lets owner CRUD roles. `RoleEditorDialog` is a matrix of features × actions checkboxes.
- TeamList shows a Select to switch a member's role inline.
- InviteDialog includes a required role select for member invites; the role is propagated when `accept_invitation` runs.
- Existing members were backfilled to the Editor role to preserve current behavior.
