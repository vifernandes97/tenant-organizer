-- Add title column to posts table for AI-generated titles
ALTER TABLE public.posts ADD COLUMN title text;