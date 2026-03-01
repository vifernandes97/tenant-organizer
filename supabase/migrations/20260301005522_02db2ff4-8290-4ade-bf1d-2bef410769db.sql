
CREATE TYPE public.brainstorm_idea_status AS ENUM ('nova', 'dar_sequencia', 'reformular', 'abandonar');

ALTER TABLE public.brainstorm_ideas
  ADD COLUMN status public.brainstorm_idea_status NOT NULL DEFAULT 'nova'::public.brainstorm_idea_status;
