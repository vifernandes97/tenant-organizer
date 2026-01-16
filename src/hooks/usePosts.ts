import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Post = Database['public']['Tables']['posts']['Row'];
type PostInsert = Database['public']['Tables']['posts']['Insert'];
type PostUpdate = Database['public']['Tables']['posts']['Update'];
type PostImage = Database['public']['Tables']['post_images']['Row'];
type SocialChannel = Database['public']['Enums']['social_channel'];
type PostStatus = Database['public']['Enums']['post_status'];

export type PostWithImages = Post & {
  post_images: PostImage[];
  clients?: { name: string } | null;
};

export const postSchema = z.object({
  client_id: z.string().uuid('Selecione um cliente'),
  channel: z.enum(['instagram_feed', 'instagram_reels', 'instagram_story', 'tiktok', 'linkedin', 'youtube', 'facebook', 'twitter'] as const, {
    required_error: 'Selecione um canal',
  }),
  scheduled_at: z.string().min(1, 'Selecione data e hora'),
  caption: z.string().max(2200, 'Máximo 2200 caracteres').optional(),
  status: z.enum(['draft', 'approved', 'scheduled', 'published'] as const).default('draft'),
});

export type PostFormData = z.infer<typeof postSchema>;

interface PostFilters {
  month?: Date;
  clientId?: string;
  status?: PostStatus[];
  channel?: SocialChannel[];
}

export function usePosts(filters?: PostFilters) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['posts', filters, profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      let query = supabase
        .from('posts')
        .select(`
          *,
          post_images (id, image_url, display_order),
          clients (name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('scheduled_at', { ascending: true });

      if (filters?.month) {
        const startOfMonth = new Date(filters.month.getFullYear(), filters.month.getMonth(), 1);
        const endOfMonth = new Date(filters.month.getFullYear(), filters.month.getMonth() + 1, 0, 23, 59, 59);
        query = query
          .gte('scheduled_at', startOfMonth.toISOString())
          .lte('scheduled_at', endOfMonth.toISOString());
      }

      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.channel && filters.channel.length > 0) {
        query = query.in('channel', filters.channel);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PostWithImages[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function usePost(id: string | null) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          post_images (id, image_url, display_order),
          clients (name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as PostWithImages;
    },
    enabled: !!id && !!profile?.tenant_id,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ post, images }: { post: PostFormData; images: File[] }) => {
      if (!profile?.tenant_id) throw new Error('Tenant não encontrado');

      const postData: PostInsert = {
        tenant_id: profile.tenant_id,
        client_id: post.client_id,
        channel: post.channel,
        scheduled_at: post.scheduled_at,
        caption: post.caption || null,
        status: post.status,
      };

      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert(postData)
        .select()
        .single();

      if (postError) throw postError;

      // Upload images
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const file = images[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${profile.tenant_id}/${newPost.id}/${i}-${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('post-images')
            .getPublicUrl(fileName);

          const { error: imageError } = await supabase
            .from('post_images')
            .insert({
              post_id: newPost.id,
              tenant_id: profile.tenant_id,
              image_url: publicUrl,
              display_order: i,
            });

          if (imageError) throw imageError;
        }
      }

      return newPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post criado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar post:', error);
      toast.error('Erro ao criar post');
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      id, 
      post, 
      newImages, 
      removedImageIds 
    }: { 
      id: string; 
      post: Partial<PostFormData>; 
      newImages?: File[]; 
      removedImageIds?: string[] 
    }) => {
      if (!profile?.tenant_id) throw new Error('Tenant não encontrado');

      const postUpdate: PostUpdate = {};
      if (post.client_id) postUpdate.client_id = post.client_id;
      if (post.channel) postUpdate.channel = post.channel;
      if (post.scheduled_at) postUpdate.scheduled_at = post.scheduled_at;
      if (post.caption !== undefined) postUpdate.caption = post.caption || null;
      if (post.status) postUpdate.status = post.status;

      const { data: updatedPost, error: postError } = await supabase
        .from('posts')
        .update(postUpdate)
        .eq('id', id)
        .select()
        .single();

      if (postError) throw postError;

      // Remove images
      if (removedImageIds && removedImageIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('post_images')
          .delete()
          .in('id', removedImageIds);

        if (deleteError) throw deleteError;
      }

      // Upload new images
      if (newImages && newImages.length > 0) {
        const { data: existingImages } = await supabase
          .from('post_images')
          .select('display_order')
          .eq('post_id', id)
          .order('display_order', { ascending: false })
          .limit(1);

        let startOrder = (existingImages?.[0]?.display_order ?? -1) + 1;

        for (let i = 0; i < newImages.length; i++) {
          const file = newImages[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${profile.tenant_id}/${id}/${startOrder + i}-${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('post-images')
            .getPublicUrl(fileName);

          const { error: imageError } = await supabase
            .from('post_images')
            .insert({
              post_id: id,
              tenant_id: profile.tenant_id,
              image_url: publicUrl,
              display_order: startOrder + i,
            });

          if (imageError) throw imageError;
        }
      }

      return updatedPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post'] });
      toast.success('Post atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar post:', error);
      toast.error('Erro ao atualizar post');
    },
  });
}

export function useUpdatePostStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PostStatus }) => {
      const { data, error } = await supabase
        .from('posts')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post'] });
      toast.success('Status atualizado!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete images first
      const { error: imagesError } = await supabase
        .from('post_images')
        .delete()
        .eq('post_id', id);

      if (imagesError) throw imagesError;

      // Delete post
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir post:', error);
      toast.error('Erro ao excluir post');
    },
  });
}
