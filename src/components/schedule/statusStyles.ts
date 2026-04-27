import type { Database } from '@/integrations/supabase/types';

type PostStatus = Database['public']['Enums']['post_status'];

/**
 * Tailwind classes for left border colors per post status.
 * Used to give a quick visual scan of statuses across the calendar.
 */
export const STATUS_BORDER_CLASS: Record<PostStatus, string> = {
  draft: 'border-l-muted-foreground/40',
  ai_generated: 'border-l-violet-500',
  reviewed: 'border-l-orange-500',
  approved: 'border-l-blue-500',
  scheduled: 'border-l-amber-500',
  published: 'border-l-green-500',
};

/**
 * Accent classes for stat cards (bottom bar color).
 */
export const STATUS_ACCENT_CLASS: Record<PostStatus | 'pending', string> = {
  draft: 'bg-muted-foreground/40',
  ai_generated: 'bg-violet-500',
  reviewed: 'bg-orange-500',
  approved: 'bg-blue-500',
  scheduled: 'bg-amber-500',
  published: 'bg-green-500',
  pending: 'bg-orange-500',
};

/**
 * Publication progress order — lowest = least progressed.
 * Used to pick the "weakest" status across multi-channel groups.
 */
export const STATUS_PROGRESS_ORDER: Record<PostStatus, number> = {
  draft: 0,
  ai_generated: 1,
  reviewed: 2,
  approved: 3,
  scheduled: 4,
  published: 5,
};

/**
 * Returns the least-progressed status from a list (most "behind").
 */
export function getMinStatus(statuses: PostStatus[]): PostStatus {
  if (statuses.length === 0) return 'draft';
  return statuses.reduce((min, s) =>
    STATUS_PROGRESS_ORDER[s] < STATUS_PROGRESS_ORDER[min] ? s : min
  );
}
