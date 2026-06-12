import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Feature, Action } from './usePermissions';

export interface Role {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  feature: Feature;
  action: Action;
}

export function useRoles() {
  const { profile } = useAuth();
  const qc = useQueryClient();

  const rolesQuery = useQuery({
    queryKey: ['roles', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [] as Role[];
      const { data, error } = await supabase
        .from('roles' as any)
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('is_system', { ascending: false })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Role[];
    },
    enabled: !!profile?.tenant_id,
  });

  const permissionsQuery = useQuery({
    queryKey: ['role-permissions', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [] as RolePermission[];
      const roleIds = (rolesQuery.data || []).map((r) => r.id);
      if (!roleIds.length) return [];
      const { data, error } = await supabase
        .from('role_permissions' as any)
        .select('*')
        .in('role_id', roleIds);
      if (error) throw error;
      return (data || []) as unknown as RolePermission[];
    },
    enabled: !!profile?.tenant_id && !!rolesQuery.data?.length,
  });

  const getRolePermissions = (roleId: string) =>
    (permissionsQuery.data || []).filter((p) => p.role_id === roleId);

  const upsertRole = useMutation({
    mutationFn: async (input: {
      id?: string;
      name: string;
      description?: string | null;
      permissions: { feature: Feature; action: Action }[];
    }) => {
      if (!profile?.tenant_id) throw new Error('Sem tenant');
      let roleId = input.id;

      if (roleId) {
        const { error } = await supabase
          .from('roles' as any)
          .update({ name: input.name, description: input.description ?? null })
          .eq('id', roleId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('roles' as any)
          .insert({
            tenant_id: profile.tenant_id,
            name: input.name,
            description: input.description ?? null,
            is_system: false,
          })
          .select('id')
          .single();
        if (error) throw error;
        roleId = (data as any).id;
      }

      // Replace permissions: delete all then insert
      await supabase.from('role_permissions' as any).delete().eq('role_id', roleId!);
      if (input.permissions.length) {
        const rows = input.permissions.map((p) => ({ role_id: roleId, feature: p.feature, action: p.action }));
        const { error: insErr } = await supabase.from('role_permissions' as any).insert(rows);
        if (insErr) throw insErr;
      }
      return roleId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['role-permissions'] });
      qc.invalidateQueries({ queryKey: ['my-permissions'] });
      toast.success('Papel salvo');
    },
    onError: (e: any) => {
      console.error(e);
      toast.error(e?.message || 'Erro ao salvar papel');
    },
  });

  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from('roles' as any).delete().eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('Papel excluído');
    },
    onError: (e: any) => {
      console.error(e);
      toast.error(e?.message || 'Erro ao excluir papel');
    },
  });

  return {
    roles: rolesQuery.data || [],
    isLoading: rolesQuery.isLoading || permissionsQuery.isLoading,
    getRolePermissions,
    upsertRole: upsertRole.mutate,
    isSavingRole: upsertRole.isPending,
    deleteRole: deleteRole.mutate,
    isDeletingRole: deleteRole.isPending,
  };
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, customRoleId }: { userId: string; customRoleId: string | null }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ custom_role_id: customRoleId } as any)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-members'] });
      qc.invalidateQueries({ queryKey: ['my-permissions'] });
      toast.success('Papel atualizado');
    },
    onError: (e: any) => {
      console.error(e);
      toast.error('Erro ao atualizar papel');
    },
  });
}
