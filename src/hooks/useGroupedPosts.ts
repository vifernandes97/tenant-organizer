import { useMemo } from 'react';
import { PostWithImages } from '@/hooks/usePosts';
import type { Database } from '@/integrations/supabase/types';

type SocialChannel = Database['public']['Enums']['social_channel'];

// Group of posts with the same group_id
export type PostGroup = {
  groupId: string;
  posts: PostWithImages[];
  // Shared data from the first post
  clientId: string;
  clientName: string;
  scheduledAt: string;
  title: string | null;
  firstImage: string | null;
  channels: SocialChannel[];
};

/**
 * Groups posts by group_id (or individual id if no group_id).
 * Returns an array of PostGroup objects for calendar rendering.
 */
export function groupPosts(posts: PostWithImages[]): PostGroup[] {
  const groups = new Map<string, PostWithImages[]>();

  posts.forEach((post) => {
    // Posts without group_id use their own id as key
    const key = post.group_id || post.id;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(post);
  });

  return Array.from(groups.entries()).map(([groupId, groupPosts]) => {
    // Sort posts by channel for consistent ordering
    const sortedPosts = [...groupPosts].sort((a, b) => 
      a.channel.localeCompare(b.channel)
    );
    
    const primaryPost = sortedPosts[0];
    
    return {
      groupId,
      posts: sortedPosts,
      clientId: primaryPost.client_id,
      clientName: primaryPost.clients?.name || '',
      scheduledAt: primaryPost.scheduled_at,
      title: primaryPost.title,
      firstImage: primaryPost.post_images?.[0]?.image_url || null,
      channels: sortedPosts.map((p) => p.channel),
    };
  });
}

/**
 * Hook that returns grouped posts for calendar display.
 */
export function useGroupedPosts(posts: PostWithImages[]): PostGroup[] {
  return useMemo(() => groupPosts(posts), [posts]);
}
