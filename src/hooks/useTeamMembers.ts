import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'owner' | 'member';
}

export function useTeamMembers() {
  const { profile, userRole } = useAuth();
  const queryClient = useQueryClient();

  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ['team-members', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      // Buscar roles do tenant
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('tenant_id', profile.tenant_id);

      if (rolesError) throw rolesError;

      // Buscar profiles dos usuários
      const userIds = roles?.map(r => r.user_id) || [];
      if (userIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combinar dados
      const members: TeamMember[] = (profiles || []).map(p => {
        const userRole = roles?.find(r => r.user_id === p.id);
        return {
          id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          role: userRole?.role || 'member',
        };
      });

      // Ordenar: owners primeiro
      return members.sort((a, b) => {
        if (a.role === 'owner' && b.role !== 'owner') return -1;
        if (a.role !== 'owner' && b.role === 'owner') return 1;
        return (a.full_name || '').localeCompare(b.full_name || '');
      });
    },
    enabled: !!profile?.tenant_id,
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.rpc('remove_team_member', { _member_id: memberId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Membro removido com sucesso');
    },
    onError: (error) => {
      console.error('Error removing member:', error);
      toast.error('Erro ao remover membro');
    },
  });

  const isOwner = userRole?.role === 'owner';

  return {
    members,
    isLoading,
    error,
    isOwner,
    removeMember: removeMemberMutation.mutate,
    isRemoving: removeMemberMutation.isPending,
  };
}
