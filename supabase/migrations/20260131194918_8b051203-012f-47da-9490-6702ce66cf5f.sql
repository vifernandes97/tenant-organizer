-- Add group_id column to posts table for multi-channel grouping
ALTER TABLE public.posts ADD COLUMN group_id uuid DEFAULT NULL;

-- Create index for efficient grouping queries
CREATE INDEX idx_posts_group_id ON public.posts (group_id) WHERE group_id IS NOT NULL;