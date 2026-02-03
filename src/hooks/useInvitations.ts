import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
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
      clientIds 
    }: { 
      email: string; 
      role: 'member' | 'owner';
      clientIds?: string[] | null;
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
        })
        .select()
        .single();

      if (error) throw error;

      // Gerar link de convite
      const inviteUrl = `${window.location.origin}/convite/${token}`;

      return { invitation: data, inviteUrl };
    },
    onSuccess: ({ inviteUrl }) => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Convite criado com sucesso!', {
        description: 'O link foi copiado para a área de transferência.',
      });
      navigator.clipboard.writeText(inviteUrl);
    },
    onError: (error: any) => {
      console.error('Error creating invitation:', error);
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
      toast.success('Convite revogado');
    },
    onError: (error) => {
      console.error('Error revoking invitation:', error);
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
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return { valid: false, invitation: null };
    }

    // Buscar nome do tenant via RPC (bypassa RLS para usuários anônimos)
    const { data: tenantName } = await supabase
      .rpc('get_tenant_name_for_invitation', { invitation_token: token });

    return {
      valid: true,
      invitation: data as Invitation,
      tenantName: tenantName || 'Organização',
    };
  }, []);

  const acceptInvitationMutation = useMutation({
    mutationFn: async ({ token, userId }: { token: string; userId: string }) => {
      // 1. Buscar convite válido
      const { data: invitation, error: findError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (findError || !invitation) {
        throw new Error('Convite inválido ou expirado');
      }

      // 2. Verificar se profile já existe
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (existingProfile) {
        // Atualizar profile existente
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ tenant_id: invitation.tenant_id })
          .eq('id', userId);

        if (profileError) throw profileError;
      } else {
        // Criar novo profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            tenant_id: invitation.tenant_id,
          });

        if (profileError) throw profileError;
      }

      // 3. Criar user_role (upsert para evitar erro de chave duplicada)
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert(
          {
            user_id: userId,
            tenant_id: invitation.tenant_id,
            role: invitation.role,
          },
          { onConflict: 'user_id,tenant_id' }
        );

      if (roleError) throw roleError;

      // 4. Criar acessos aos clientes (se especificados no convite)
      if (invitation.client_ids && invitation.client_ids.length > 0) {
        const accessInserts = invitation.client_ids.map((clientId: string) => ({
          user_id: userId,
          client_id: clientId,
          tenant_id: invitation.tenant_id,
        }));

        const { error: accessError } = await supabase
          .from('user_client_access')
          .upsert(accessInserts, { onConflict: 'user_id,client_id' });

        if (accessError) {
          console.error('Error creating client access:', accessError);
          // Não falhar o aceite do convite por causa disso
        }
      }

      // 5. Marcar convite como aceito
      const { error: updateError } = await supabase
        .from('invitations')
        .update({
          status: 'accepted' as InvitationStatus,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      return invitation;
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
