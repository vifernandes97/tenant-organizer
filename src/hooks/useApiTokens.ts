import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { maybeHandlePlanError } from '@/lib/planErrors';

export interface ApiToken {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `mh_live_${b64}`;
}

export function useApiTokens() {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;
  const queryClient = useQueryClient();

  const tokensQuery = useQuery({
    queryKey: ['tenant-api-tokens', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_api_tokens')
        .select('id, name, token_prefix, created_at, last_used_at, revoked_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ApiToken[];
    },
    enabled: !!tenantId,
  });

  const createToken = useMutation({
    mutationFn: async (name: string): Promise<{ token: string; row: ApiToken }> => {
      const plain = generateToken();
      const hash = await sha256Hex(plain);
      const prefix = plain.slice(0, 16); // "mh_live_xxxxxxxx"

      const { data, error } = await supabase
        .from('tenant_api_tokens')
        .insert({
          tenant_id: tenantId!,
          created_by: user!.id,
          name,
          token_hash: hash,
          token_prefix: prefix,
        })
        .select('id, name, token_prefix, created_at, last_used_at, revoked_at')
        .single();
      if (error) throw error;
      return { token: plain, row: data as ApiToken };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-api-tokens'] });
    },
    onError: (e: any) => {
      if (maybeHandlePlanError(e)) return;
      toast.error(e?.message || 'Erro ao criar token');
    },
  });

  const revokeToken = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tenant_api_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-api-tokens'] });
      toast.success('Token revogado');
    },
    onError: () => toast.error('Erro ao revogar token'),
  });

  const deleteToken = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tenant_api_tokens').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-api-tokens'] });
      toast.success('Token removido');
    },
    onError: () => toast.error('Erro ao remover token'),
  });

  return {
    tokens: tokensQuery.data ?? [],
    isLoading: tokensQuery.isLoading,
    createToken,
    revokeToken,
    deleteToken,
  };
}
