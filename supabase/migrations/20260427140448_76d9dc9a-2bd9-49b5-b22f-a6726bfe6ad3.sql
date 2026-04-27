-- 1. Add channel column with default
ALTER TABLE public.client_post_statuses
ADD COLUMN channel public.social_channel NOT NULL DEFAULT 'instagram_feed';

-- 2. Migrate existing rows: replicate each existing status to all active channels of the client
DO $$
DECLARE
  r record;
  ch public.social_channel;
  client_channels public.social_channel[];
BEGIN
  -- For each existing status (assumed currently as instagram_feed), replicate to other channels of the client
  FOR r IN
    SELECT cps.*, c.channels AS client_channels
    FROM public.client_post_statuses cps
    JOIN public.clients c ON c.id = cps.client_id
  LOOP
    client_channels := COALESCE(r.client_channels, ARRAY[]::public.social_channel[]);

    IF array_length(client_channels, 1) IS NULL THEN
      CONTINUE;
    END IF;

    FOREACH ch IN ARRAY client_channels LOOP
      IF ch <> 'instagram_feed' THEN
        INSERT INTO public.client_post_statuses
          (client_id, tenant_id, name, slug, color, icon, display_order, is_final, channel)
        VALUES
          (r.client_id, r.tenant_id, r.name, r.slug, r.color, r.icon, r.display_order, r.is_final, ch)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 3. Add a unique index on (client_id, channel, slug)
CREATE UNIQUE INDEX IF NOT EXISTS client_post_statuses_client_channel_slug_uniq
ON public.client_post_statuses (client_id, channel, slug);

-- 4. Useful index for lookups
CREATE INDEX IF NOT EXISTS client_post_statuses_client_channel_idx
ON public.client_post_statuses (client_id, channel, display_order);