import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { maybeHandlePlanError } from '@/lib/planErrors';
import type { Database } from '@/integrations/supabase/types';

type InvitationStatus = Database['public']['Enums']['invitation_status'];

export interface Invitation {
  id: string;
  email: string;
  role: 'owner' | 'member';
  status: InvitationStatus;
  token: string;
  expires_at: string;
  created_at: string;
  client_ids: string[] | null;
  tenant_id: string;
}

export function useInvitations() {
  const { profile, tenant, user, userRole } = useAuth();
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading, error } = useQuery({
    queryKey: ['invitations', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Invitation[];
    },
    enabled: !!profile?.tenant_id && userRole?.role === 'owner',
  });

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

  const createInvitationMutation = useMutation({
    mutationFn: async ({ 
      email, 
      role, 
      clientIds,
      customRoleId,
    }: { 
      email: string; 
      role: 'member' | 'owner';
      clientIds?: string[] | null;
      customRoleId?: string | null;
    }) => {
      if (!profile?.tenant_id || !user?.id) {
        throw new Error('Dados do usuário não encontrados');
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

      const { data, error } = await supabase
        .from('invitations')
        .insert({
          tenant_id: profile.tenant_id,
          email: email.toLowerCase().trim(),
          role,
          token,
          invited_by: user.id,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
          client_ids: clientIds || null,
          custom_role_id: customRoleId || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      const inviteUrl = `${window.location.origin}/convite/${token}`;
      return { invitation: data, inviteUrl };
    },
    onSuccess: ({ inviteUrl }) => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['plan-usage'] });
      toast.success('Convite criado com sucesso!', {
        description: 'O link foi copiado para a área de transferência.',
      });
      navigator.clipboard.writeText(inviteUrl);
    },
    onError: (error: any) => {
      console.error('Error creating invitation:', error);
      if (maybeHandlePlanError(error)) return;
      if (error.code === '23505') {
        toast.error('Este email já possui um convite pendente');
      } else {
        toast.error('Erro ao criar convite');
      }
    },
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'revoked' as InvitationStatus })
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['plan-usage'] });
      toast.success('Convite revogado');
    },
    onError: (error) => {
      console.error('Error revoking invitation:', error);
      if (maybeHandlePlanError(error)) return;
      toast.error('Erro ao revogar convite');
    },
  });

  const copyInviteLinkMutation = useMutation({
    mutationFn: async (token: string) => {
      const inviteUrl = `${window.location.origin}/convite/${token}`;
      await navigator.clipboard.writeText(inviteUrl);
      return inviteUrl;
    },
    onSuccess: () => {
      toast.success('Link copiado para a área de transferência');
    },
  });

  return {
    invitations,
    pendingInvitations,
    isLoading,
    error,
    createInvitation: createInvitationMutation.mutate,
    isCreating: createInvitationMutation.isPending,
    revokeInvitation: revokeInvitationMutation.mutate,
    isRevoking: revokeInvitationMutation.isPending,
    copyInviteLink: copyInviteLinkMutation.mutate,
  };
}

// Hook separado para validar e aceitar convites
export function useAcceptInvitation() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const validateTokenQuery = useQuery({
    queryKey: ['validate-invitation'],
    queryFn: async () => null,
    enabled: false, // Disabled by default, will be called manually
  });

  const validateToken = useCallback(async (token: string) => {
    // Usar RPC SECURITY DEFINER para permitir validação por usuários anônimos
    const { data, error } = await supabase
      .rpc('validate_invitation_token', { _token: token });

    const result = data as { valid: boolean; email?: string; tenant_name?: string } | null;

    if (error || !result?.valid) {
      return { valid: false, invitation: null };
    }

    return {
      valid: true,
      invitation: { email: result.email } as Partial<Invitation>,
      tenantName: result.tenant_name || 'Organização',
    };
  }, []);

  const acceptInvitationMutation = useMutation({
    mutationFn: async ({ token, userId }: { token: string; userId: string }) => {
      // Usar função SECURITY DEFINER para aceitar convite atomicamente
      const { data, error } = await supabase
        .rpc('accept_invitation', { 
          _token: token, 
          _user_id: userId 
        });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; tenant_id?: string; role?: string } | null;
      
      if (!result?.success) {
        throw new Error(result?.error || 'Erro ao aceitar convite');
      }

      return result;
    },
    onSuccess: async () => {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Convite aceito com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || 'Erro ao aceitar convite');
    },
  });

  return {
    validateToken,
    acceptInvitation: acceptInvitationMutation.mutate,
    isAccepting: acceptInvitationMutation.isPending,
  };
}
