import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { extractPlainText } from '@/lib/textUtils';

type Post = Database['public']['Tables']['posts']['Row'];
type PostInsert = Database['public']['Tables']['posts']['Insert'];
type PostUpdate = Database['public']['Tables']['posts']['Update'];
type PostImage = Database['public']['Tables']['post_images']['Row'];
type SocialChannel = Database['public']['Enums']['social_channel'];
type PostStatus = Database['public']['Enums']['post_status'];

export type PostWithImages = Post & {
  post_images: (PostImage & { media_type?: string; alt_text?: string | null })[];
  clients?: { name: string } | null;
  open_comments_count?: number;
};

// Project types for WordPress
export const PROJECT_TYPES = [
  { value: 'ete', label: 'ETE' },
  { value: 'eta', label: 'ETA' },
  { value: 'osmose_reversa', label: 'Osmose Reversa' },
  { value: 'ultrafiltracao', label: 'Ultrafiltração' },
  { value: 'fisico_quimico', label: 'Físico Químico' },
  { value: 'mbr', label: 'MBR' },
] as const;

export type ProjectType = typeof PROJECT_TYPES[number]['value'];

// Extract storage path from URL or return as-is if it's already a path
function extractStoragePath(imageUrl: string): string {
  // If it's a full Supabase storage URL, extract the path
  const storageUrlMatch = imageUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/post-images\/(.+)/);
  if (storageUrlMatch) {
    return storageUrlMatch[1];
  }
  // If it's already a path (new format), return as-is
  if (!imageUrl.startsWith('http')) {
    return imageUrl;
  }
  // Legacy URL format - try to extract path
  const urlParts = imageUrl.split('/post-images/');
  if (urlParts.length > 1) {
    return urlParts[1].split('?')[0]; // Remove query params if any
  }
  return imageUrl;
}

// Generate signed URL for an image (valid for 1 hour)
async function getSignedImageUrl(imageUrl: string): Promise<string> {
  const path = extractStoragePath(imageUrl);
  const { data, error } = await supabase.storage
    .from('post-images')
    .createSignedUrl(path, 3600); // 1 hour expiry
  
  if (error || !data?.signedUrl) {
    console.error('Error creating signed URL:', error);
    return imageUrl; // Fallback to original URL
  }
  return data.signedUrl;
}

// Transform post images to use signed URLs
async function transformPostImagesWithSignedUrls(posts: PostWithImages[]): Promise<PostWithImages[]> {
  const transformedPosts = await Promise.all(
    posts.map(async (post) => {
      if (!post.post_images || post.post_images.length === 0) {
        return post;
      }
      const signedImages = await Promise.all(
        post.post_images.map(async (img) => ({
          ...img,
          image_url: await getSignedImageUrl(img.image_url),
        }))
      );
      return { ...post, post_images: signedImages };
    })
  );
  return transformedPosts;
}

const socialChannels = ['instagram_feed', 'instagram_reels', 'instagram_story', 'tiktok', 'linkedin', 'youtube', 'facebook', 'twitter', 'wordpress'] as const;

export const postSchema = z.object({
  client_id: z.string().uuid('Selecione um cliente'),
  channels: z.array(z.enum(socialChannels)).min(1, 'Selecione pelo menos um canal'),
  scheduled_at: z.string().min(1, 'Selecione data e hora'),
  caption: z.string().max(2200, 'Máximo 2200 caracteres').optional(),
  status: z.enum(['draft', 'approved', 'scheduled', 'published'] as const).default('draft'),
});

// Schema for editing (single channel)
export const postEditSchema = z.object({
  client_id: z.string().uuid('Selecione um cliente'),
  channel: z.enum(socialChannels, {
    required_error: 'Selecione um canal',
  }),
  scheduled_at: z.string().min(1, 'Selecione data e hora'),
  caption: z.string().max(2200, 'Máximo 2200 caracteres').optional(),
  status: z.enum(['draft', 'approved', 'scheduled', 'published'] as const).default('draft'),
});

export type PostFormData = z.infer<typeof postSchema>;
export type PostEditFormData = z.infer<typeof postEditSchema>;

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
          post_images (id, image_url, display_order, media_type, alt_text),
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
      
      // Transform image URLs to signed URLs for private bucket access
      const postsWithSignedUrls = await transformPostImagesWithSignedUrls(data as PostWithImages[]);
      
      // Fetch open comments count for all posts
      const postIds = postsWithSignedUrls.map(p => p.id);
      if (postIds.length > 0) {
        const { data: commentCounts } = await supabase
          .from('post_comments')
          .select('post_id')
          .in('post_id', postIds)
          .eq('status', 'open')
          .is('parent_id', null);

        // Count comments per post
        const countByPost = new Map<string, number>();
        for (const c of commentCounts || []) {
          countByPost.set(c.post_id, (countByPost.get(c.post_id) || 0) + 1);
        }

        // Merge with posts
        return postsWithSignedUrls.map(p => ({
          ...p,
          open_comments_count: countByPost.get(p.id) || 0
        }));
      }
      
      return postsWithSignedUrls;
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
          post_images (id, image_url, display_order, media_type, alt_text),
          clients (name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Transform image URLs to signed URLs for private bucket access
      const transformed = await transformPostImagesWithSignedUrls([data as PostWithImages]);
      return transformed[0];
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

      const createdPosts: Post[] = [];

      // Generate group_id if multiple channels selected
      const groupId = post.channels.length > 1 ? crypto.randomUUID() : null;

      // Upload images first (will be shared across all posts)
      const uploadedMedia: { path: string; mediaType: 'image' | 'video' | 'document' }[] = [];
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const file = images[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${profile.tenant_id}/shared/${Date.now()}-${i}.${fileExt}`;
          
          // Determine media type
          let mediaType: 'image' | 'video' | 'document' = 'document';
          if (file.type.startsWith('image/')) {
            mediaType = 'image';
          } else if (file.type.startsWith('video/')) {
            mediaType = 'video';
          }

          const { error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Store just the path - signed URLs will be generated when fetching
          uploadedMedia.push({ path: fileName, mediaType });
        }
      }

      // Generate AI title if caption exists
      let generatedTitle: string | null = null;
      if (post.caption) {
        const plainText = extractPlainText(post.caption);
        if (plainText.trim()) {
          try {
            const { data: titleData } = await supabase.functions.invoke('generate-title', {
              body: { caption: plainText }
            });
            generatedTitle = titleData?.title || null;
          } catch (e) {
            console.error('Error generating title:', e);
            // Continue without title - will use fallback in UI
          }
        }
      }

      // Create a post for each selected channel
      for (const channel of post.channels) {
        const postData: PostInsert = {
          tenant_id: profile.tenant_id,
          client_id: post.client_id,
          channel: channel,
          scheduled_at: post.scheduled_at,
          caption: post.caption || null,
          status: post.status,
          title: generatedTitle,
          group_id: groupId,
        };

        const { data: newPost, error: postError } = await supabase
          .from('posts')
          .insert(postData)
          .select()
          .single();

        if (postError) throw postError;

        // Link uploaded media to this post
        for (let i = 0; i < uploadedMedia.length; i++) {
          const media = uploadedMedia[i];
          const { error: imageError } = await supabase
            .from('post_images')
            .insert({
              post_id: newPost.id,
              tenant_id: profile.tenant_id,
              image_url: media.path,
              display_order: i,
              media_type: media.mediaType,
            });

          if (imageError) throw imageError;
        }

        createdPosts.push(newPost);
      }

      return createdPosts;
    },
    onSuccess: (posts) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      const count = posts.length;
      toast.success(`${count} post${count > 1 ? 's criados' : ' criado'} com sucesso!`);
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
      post: Partial<PostEditFormData>; 
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

      // Regenerate AI title if caption changed
      if (post.caption !== undefined) {
        const plainText = extractPlainText(post.caption || '');
        if (plainText.trim()) {
          try {
            const { data: titleData } = await supabase.functions.invoke('generate-title', {
              body: { caption: plainText }
            });
            postUpdate.title = titleData?.title || null;
          } catch (e) {
            console.error('Error generating title:', e);
            // Keep existing title on error
          }
        } else {
          postUpdate.title = null;
        }
      }

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

      // Upload new images/videos
      if (newImages && newImages.length > 0) {
        const { data: existingImagesData } = await supabase
          .from('post_images')
          .select('display_order')
          .eq('post_id', id)
          .order('display_order', { ascending: false })
          .limit(1);

        let startOrder = (existingImagesData?.[0]?.display_order ?? -1) + 1;

        for (let i = 0; i < newImages.length; i++) {
          const file = newImages[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${profile.tenant_id}/${id}/${startOrder + i}-${Date.now()}.${fileExt}`;
          
          // Determine media type
          let mediaType: 'image' | 'video' | 'document' = 'document';
          if (file.type.startsWith('image/')) {
            mediaType = 'image';
          } else if (file.type.startsWith('video/')) {
            mediaType = 'video';
          }

          const { error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Store just the path - signed URLs will be generated when fetching
          const { error: imageError } = await supabase
            .from('post_images')
            .insert({
              post_id: id,
              tenant_id: profile.tenant_id,
              image_url: fileName,
              display_order: startOrder + i,
              media_type: mediaType,
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

export function useRescheduleGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ posts, newDate }: { posts: PostWithImages[]; newDate: Date }) => {
      // Update each post's scheduled_at, preserving the original time
      for (const post of posts) {
        const oldDate = new Date(post.scheduled_at);
        const updated = new Date(newDate);
        updated.setHours(oldDate.getHours(), oldDate.getMinutes(), oldDate.getSeconds());

        const { error } = await supabase
          .from('posts')
          .update({ scheduled_at: updated.toISOString() })
          .eq('id', post.id);

        if (error) throw error;
      }
    },
    onSuccess: (_, { newDate }) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      const formatted = newDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      toast.success(`Post reagendado para ${formatted}`);
    },
    onError: (error) => {
      console.error('Erro ao reagendar post:', error);
      toast.error('Erro ao reagendar post');
    },
  });
}
