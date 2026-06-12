import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Feature = 'clients' | 'posts' | 'post_status' | 'brainstorm';
export type Action = 'view' | 'create' | 'edit' | 'delete';

export const ALL_FEATURES: { key: Feature; label: string; description: string; actions: Action[] }[] = [
  {
    key: 'clients',
    label: 'Clientes',
    description: 'Ver e editar dados dos clientes (persona, canais, contato...)',
    actions: ['view', 'edit'],
  },
  {
    key: 'posts',
    label: 'Posts (Cronograma)',
    description: 'Visualizar, criar, editar e excluir posts',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: 'post_status',
    label: 'Status de Post',
    description: 'Mudar o status (aprovar, revisar, publicar)',
    actions: ['edit'],
  },
  {
    key: 'brainstorm',
    label: 'Brainstorm',
    description: 'Visualizar, criar, editar e excluir ideias',
    actions: ['view', 'create', 'edit', 'delete'],
  },
];

export const ACTION_LABELS: Record<Action, string> = {
  view: 'Visualizar',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
};

type PermissionSet = Set<string>; // "feature:action"
const key = (f: Feature, a: Action) => `${f}:${a}`;

export function usePermissions() {
  const { user, userRole, profile } = useAuth();
  const isOwner = userRole?.role === 'owner';

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['my-permissions', user?.id, profile?.tenant_id],
    queryFn: async (): Promise<PermissionSet> => {
      if (!user?.id || !profile?.tenant_id) return new Set();

      // Get user's custom role
      const { data: userRoleRow } = await supabase
        .from('user_roles')
        .select('custom_role_id')
        .eq('user_id', user.id)
        .eq('tenant_id', profile.tenant_id)
        .maybeSingle();

      const customRoleId = (userRoleRow as any)?.custom_role_id as string | null;
      if (!customRoleId) return new Set();

      const { data: perms } = await supabase
        .from('role_permissions')
        .select('feature, action')
        .eq('role_id', customRoleId);

      const set: PermissionSet = new Set();
      for (const p of perms || []) set.add(key(p.feature as Feature, p.action as Action));
      return set;
    },
    enabled: !!user?.id && !!profile?.tenant_id && !isOwner,
    staleTime: 60_000,
  });

  return useMemo(() => {
    const can = (feature: Feature, action: Action): boolean => {
      if (isOwner) return true;
      if (!permissions) return false;
      return permissions.has(key(feature, action));
    };
    return { can, isLoading, isOwner };
  }, [isOwner, isLoading, permissions]);
}
