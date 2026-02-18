ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'ai_generated' AFTER 'draft';
ALTER TYPE public.post_status ADD VALUE IF NOT EXISTS 'reviewed' AFTER 'ai_generated';