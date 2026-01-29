import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UserClientAccess {
  id: string;
  user_id: string;
  client_id: string;
  tenant_id: string;
  created_at: string;
}

export function useUserClientAccess(userId?: string) {
  const { profile, userRole } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = userRole?.role === 'owner';

  // Buscar acessos de um usuário específico (para owners)
  const { data: userAccess = [], isLoading } = useQuery({
    queryKey: ['user-client-access', userId],
    queryFn: async () => {
      if (!userId || !profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('user_client_access')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;
      return data as UserClientAccess[];
    },
    enabled: !!userId && !!profile?.tenant_id && isOwner,
  });

  // IDs dos clientes que o usuário tem acesso
  const accessibleClientIds = userAccess.map(a => a.client_id);

  // Atualizar permissões de um usuário
  const updateAccessMutation = useMutation({
    mutationFn: async ({ userId, clientIds }: { userId: string; clientIds: string[] }) => {
      if (!profile?.tenant_id) {
        throw new Error('Tenant não encontrado');
      }

      // 1. Deletar todos os acessos atuais do usuário
      const { error: deleteError } = await supabase
        .from('user_client_access')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', profile.tenant_id);

      if (deleteError) throw deleteError;

      // 2. Inserir novos acessos
      if (clientIds.length > 0) {
        const insertData = clientIds.map(clientId => ({
          user_id: userId,
          client_id: clientId,
          tenant_id: profile.tenant_id!,
        }));

        const { error: insertError } = await supabase
          .from('user_client_access')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      return { userId, clientIds };
    },
    onSuccess: ({ userId }) => {
      queryClient.invalidateQueries({ queryKey: ['user-client-access', userId] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Permissões atualizadas com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating access:', error);
      toast.error('Erro ao atualizar permissões');
    },
  });

  // Criar acessos para um novo usuário (usado ao aceitar convite)
  const createAccessMutation = useMutation({
    mutationFn: async ({ userId, clientIds, tenantId }: { userId: string; clientIds: string[]; tenantId: string }) => {
      if (clientIds.length === 0) return;

      const insertData = clientIds.map(clientId => ({
        user_id: userId,
        client_id: clientId,
        tenant_id: tenantId,
      }));

      const { error } = await supabase
        .from('user_client_access')
        .insert(insertData);

      if (error) throw error;
    },
    onError: (error) => {
      console.error('Error creating access:', error);
    },
  });

  return {
    userAccess,
    accessibleClientIds,
    isLoading,
    updateAccess: updateAccessMutation.mutate,
    updateAccessAsync: updateAccessMutation.mutateAsync,
    isUpdating: updateAccessMutation.isPending,
    createAccess: createAccessMutation.mutate,
    createAccessAsync: createAccessMutation.mutateAsync,
    isCreating: createAccessMutation.isPending,
  };
}

// Hook para buscar todos os acessos do tenant (para listagem)
export function useAllClientAccess() {
  const { profile, userRole } = useAuth();
  const isOwner = userRole?.role === 'owner';

  const { data: allAccess = [], isLoading } = useQuery({
    queryKey: ['all-client-access', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('user_client_access')
        .select('*')
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;
      return data as UserClientAccess[];
    },
    enabled: !!profile?.tenant_id && isOwner,
  });

  // Agrupar por user_id
  const accessByUser = allAccess.reduce((acc, item) => {
    if (!acc[item.user_id]) {
      acc[item.user_id] = [];
    }
    acc[item.user_id].push(item.client_id);
    return acc;
  }, {} as Record<string, string[]>);

  return {
    allAccess,
    accessByUser,
    isLoading,
    getClientCountForUser: (userId: string) => accessByUser[userId]?.length || 0,
  };
}
