import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const commentContentSchema = z
  .string()
  .trim()
  .min(1, 'O comentário não pode ficar vazio')
  .max(2000, 'O comentário deve ter no máximo 2000 caracteres');

export type CommentStatus = 'open' | 'resolved';

export interface PostComment {
  id: string;
  post_id: string;
  image_id: string | null;
  tenant_id: string;
  author_id: string;
  content: string;
  x_position: number | null;
  y_position: number | null;
  status: CommentStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostCommentWithAuthor extends PostComment {
  author?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  resolver?: {
    full_name: string | null;
  } | null;
  replies?: PostCommentWithAuthor[];
}

interface CreateCommentInput {
  post_id: string;
  image_id?: string | null;
  content: string;
  x_position?: number | null;
  y_position?: number | null;
  parent_id?: string | null;
}

interface UpdateCommentInput {
  id: string;
  content?: string;
}

export function useComments(postId: string | null, imageId?: string | null) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['comments', postId, imageId],
    queryFn: async () => {
      if (!postId || !profile?.tenant_id) return [];

      let query = supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: true });

      // Filter by image if specified, or get all if imageId is undefined
      if (imageId !== undefined) {
        if (imageId === null) {
          query = query.is('image_id', null);
        } else {
          query = query.eq('image_id', imageId);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch author profiles
      const authorIds = [...new Set((data || []).map(c => c.author_id))];
      const resolverIds = [...new Set((data || []).filter(c => c.resolved_by).map(c => c.resolved_by!))] ;
      const allUserIds = [...new Set([...authorIds, ...resolverIds])];

      let profiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      
      if (allUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', allUserIds);

        if (profilesData) {
          profiles = Object.fromEntries(
            profilesData.map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }])
          );
        }
      }

      // Group replies under parent comments
      const commentsMap = new Map<string, PostCommentWithAuthor>();
      const rootComments: PostCommentWithAuthor[] = [];

      for (const comment of data || []) {
        const withAuthor: PostCommentWithAuthor = {
          ...comment,
          status: comment.status as CommentStatus,
          author: profiles[comment.author_id] || null,
          resolver: comment.resolved_by ? profiles[comment.resolved_by] || null : null,
          replies: [],
        };
        commentsMap.set(comment.id, withAuthor);
      }

      for (const comment of commentsMap.values()) {
        if (comment.parent_id && commentsMap.has(comment.parent_id)) {
          commentsMap.get(comment.parent_id)!.replies!.push(comment);
        } else if (!comment.parent_id) {
          rootComments.push(comment);
        }
      }

      return rootComments;
    },
    enabled: !!postId && !!profile?.tenant_id,
  });
}

export function useAllPostComments(postId: string | null) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['all-comments', postId],
    queryFn: async () => {
      if (!postId || !profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .eq('tenant_id', profile.tenant_id)
        .is('parent_id', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch author profiles
      const authorIds = [...new Set((data || []).map(c => c.author_id))];
      const resolverIds = [...new Set((data || []).filter(c => c.resolved_by).map(c => c.resolved_by!))];
      const allUserIds = [...new Set([...authorIds, ...resolverIds])];

      let profiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      
      if (allUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', allUserIds);

        if (profilesData) {
          profiles = Object.fromEntries(
            profilesData.map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }])
          );
        }
      }

      return (data || []).map(comment => ({
        ...comment,
        status: comment.status as CommentStatus,
        author: profiles[comment.author_id] || null,
        resolver: comment.resolved_by ? profiles[comment.resolved_by] || null : null,
      })) as PostCommentWithAuthor[];
    },
    enabled: !!postId && !!profile?.tenant_id,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateCommentInput) => {
      if (!profile?.tenant_id || !user) throw new Error('Não autenticado');

      const parsed = commentContentSchema.safeParse(input.content);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? 'Conteúdo inválido');
      }

      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: input.post_id,
          image_id: input.image_id || null,
          tenant_id: profile.tenant_id,
          author_id: user.id,
          content: parsed.data,
          x_position: input.x_position ?? null,
          y_position: input.y_position ?? null,
          parent_id: input.parent_id || null,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.post_id] });
      queryClient.invalidateQueries({ queryKey: ['all-comments', variables.post_id] });
      toast.success('Comentário adicionado!');
    },
    onError: (error) => {
      console.error('Erro ao criar comentário:', error);
      toast.error('Erro ao adicionar comentário');
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, content }: UpdateCommentInput) => {
      const parsed = commentContentSchema.safeParse(content);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? 'Conteúdo inválido');
      }

      const { data, error } = await supabase
        .from('post_comments')
        .update({ content: parsed.data })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['comments', data.post_id] });
      queryClient.invalidateQueries({ queryKey: ['all-comments', data.post_id] });
      toast.success('Comentário atualizado!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar comentário:', error);
      toast.error('Erro ao atualizar comentário');
    },
  });
}

export function useResolveComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, resolve }: { id: string; resolve: boolean }) => {
      const { data, error } = await supabase
        .from('post_comments')
        .update({
          status: resolve ? 'resolved' : 'open',
          resolved_by: resolve ? user?.id : null,
          resolved_at: resolve ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['comments', data.post_id] });
      queryClient.invalidateQueries({ queryKey: ['all-comments', data.post_id] });
      toast.success(data.status === 'resolved' ? 'Comentário resolvido!' : 'Comentário reaberto!');
    },
    onError: (error) => {
      console.error('Erro ao resolver comentário:', error);
      toast.error('Erro ao atualizar status');
    },
  });
}

export function useUpdateCommentPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, x, y }: { id: string; x: number; y: number }) => {
      const { data, error } = await supabase
        .from('post_comments')
        .update({ x_position: x, y_position: y })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['comments', data.post_id] });
      queryClient.invalidateQueries({ queryKey: ['all-comments', data.post_id] });
    },
    onError: (error) => {
      console.error('Erro ao mover comentário:', error);
      toast.error('Erro ao mover comentário');
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, postId }: { id: string; postId: string }) => {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return postId;
    },
    onSuccess: (postId) => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['all-comments', postId] });
      toast.success('Comentário excluído!');
    },
    onError: (error) => {
      console.error('Erro ao excluir comentário:', error);
      toast.error('Erro ao excluir comentário');
    },
  });
}
