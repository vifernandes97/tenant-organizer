import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type BrainstormIdeaStatus = 'nova' | 'dar_sequencia' | 'reformular' | 'abandonar' | 'arquivada';

export interface BrainstormIdea {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: BrainstormIdeaStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useBrainstormIdeas() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id;

  const ideasQuery = useQuery({
    queryKey: ['brainstorm-ideas', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brainstorm_ideas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BrainstormIdea[];
    },
    enabled: !!tenantId,
  });

  const createIdea = useMutation({
    mutationFn: async (idea: { title: string; description?: string }) => {
      const { data, error } = await supabase
        .from('brainstorm_ideas')
        .insert({
          title: idea.title,
          description: idea.description || null,
          tenant_id: tenantId!,
          created_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brainstorm-ideas'] });
      toast.success('Ideia criada!');
    },
    onError: () => toast.error('Erro ao criar ideia'),
  });

  const updateIdea = useMutation({
    mutationFn: async (idea: { id: string; title: string; description?: string }) => {
      const { error } = await supabase
        .from('brainstorm_ideas')
        .update({ title: idea.title, description: idea.description || null })
        .eq('id', idea.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brainstorm-ideas'] });
      toast.success('Ideia atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar ideia'),
  });

  const updateIdeaStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BrainstormIdeaStatus }) => {
      const { error } = await supabase
        .from('brainstorm_ideas')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brainstorm-ideas'] });
    },
    onError: () => toast.error('Erro ao atualizar status'),
  });

  const deleteIdea = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('brainstorm_ideas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brainstorm-ideas'] });
      toast.success('Ideia removida!');
    },
    onError: () => toast.error('Erro ao remover ideia'),
  });

  return {
    ideas: ideasQuery.data ?? [],
    isLoading: ideasQuery.isLoading,
    createIdea,
    updateIdea,
    updateIdeaStatus,
    deleteIdea,
  };
}
