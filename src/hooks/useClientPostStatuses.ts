import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type SocialChannel = Database['public']['Enums']['social_channel'];

export interface ClientPostStatus {
  id: string;
  client_id: string;
  tenant_id: string;
  channel: SocialChannel;
  name: string;
  slug: string;
  color: string;
  icon: string;
  display_order: number;
  is_final: boolean;
  created_at: string;
}

export type ClientPostStatusInsert = Omit<ClientPostStatus, 'id' | 'created_at'>;

export const DEFAULT_POST_STATUSES: Omit<ClientPostStatusInsert, 'client_id' | 'tenant_id' | 'channel'>[] = [
  { name: 'Rascunho', slug: 'draft', color: '#6b7280', icon: 'file-text', display_order: 0, is_final: false },
  { name: 'Aprovado', slug: 'approved', color: '#3b82f6', icon: 'check', display_order: 1, is_final: false },
  { name: 'Agendado', slug: 'scheduled', color: '#f59e0b', icon: 'clock', display_order: 2, is_final: false },
  { name: 'Publicado', slug: 'published', color: '#22c55e', icon: 'check-circle', display_order: 3, is_final: true },
];

export const DEFAULT_POST_STATUSES_WORDPRESS: Omit<ClientPostStatusInsert, 'client_id' | 'tenant_id' | 'channel'>[] = [
  { name: 'Rascunho', slug: 'draft', color: '#6b7280', icon: 'file-text', display_order: 0, is_final: false },
  { name: 'Gerado por IA', slug: 'ai_generated', color: '#8b5cf6', icon: 'sparkles', display_order: 1, is_final: false },
  { name: 'Revisado', slug: 'reviewed', color: '#f97316', icon: 'eye', display_order: 2, is_final: false },
  { name: 'Aprovado', slug: 'approved', color: '#3b82f6', icon: 'check', display_order: 3, is_final: false },
  { name: 'Publicado', slug: 'published', color: '#22c55e', icon: 'check-circle', display_order: 4, is_final: true },
];

export function getDefaultStatusesForChannel(channel: SocialChannel) {
  return channel === 'wordpress' ? DEFAULT_POST_STATUSES_WORDPRESS : DEFAULT_POST_STATUSES;
}

/**
 * Fetches custom statuses for a client.
 * If `channel` is provided, filters by that channel.
 * If `channel` is omitted, returns ALL custom statuses for the client (across channels).
 */
export function useClientPostStatuses(clientId: string | null | undefined, channel?: SocialChannel) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['client-post-statuses', clientId, channel ?? 'all'],
    queryFn: async () => {
      if (!clientId) return [];
      let query = supabase
        .from('client_post_statuses')
        .select('*')
        .eq('client_id', clientId)
        .order('display_order', { ascending: true });

      if (channel) {
        query = query.eq('channel', channel);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ClientPostStatus[];
    },
    enabled: !!clientId && !!profile?.tenant_id,
  });
}

export function useCreateClientPostStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (status: ClientPostStatusInsert) => {
      const { data, error } = await supabase
        .from('client_post_statuses')
        .insert(status)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-post-statuses', data.client_id] });
    },
    onError: (error) => {
      console.error('Erro ao criar status:', error);
      toast.error('Erro ao criar status');
    },
  });
}

export function useUpdateClientPostStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ClientPostStatusInsert> }) => {
      const { data, error } = await supabase
        .from('client_post_statuses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-post-statuses', data.client_id] });
    },
    onError: (error) => {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    },
  });
}

export function useDeleteClientPostStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_post_statuses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { clientId };
    },
    onSuccess: ({ clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-post-statuses', clientId] });
    },
    onError: (error) => {
      console.error('Erro ao excluir status:', error);
      toast.error('Erro ao excluir status');
    },
  });
}

/**
 * Replaces all statuses of a (client, channel) pair with the provided list.
 * If `channel` is not provided, falls back to legacy behavior (replaces all).
 */
export function useBulkUpsertClientPostStatuses() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      clientId,
      channel,
      statuses,
    }: {
      clientId: string;
      channel?: SocialChannel;
      statuses: Omit<ClientPostStatusInsert, 'client_id' | 'tenant_id' | 'channel'>[];
    }) => {
      if (!profile?.tenant_id) throw new Error('Tenant não encontrado');

      // Delete existing statuses (scoped by channel when provided)
      let del = supabase.from('client_post_statuses').delete().eq('client_id', clientId);
      if (channel) del = del.eq('channel', channel);
      const { error: delError } = await del;
      if (delError) throw delError;

      // Insert new statuses
      if (statuses.length > 0) {
        const rows = statuses.map((s, i) => ({
          ...s,
          client_id: clientId,
          tenant_id: profile.tenant_id,
          channel: channel ?? ('instagram_feed' as SocialChannel),
          display_order: i,
        }));

        const { error } = await supabase.from('client_post_statuses').insert(rows);
        if (error) throw error;
      }

      return { clientId, channel };
    },
    onSuccess: ({ clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-post-statuses', clientId] });
      toast.success('Status atualizados com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao salvar status:', error);
      toast.error('Erro ao salvar status');
    },
  });
}
