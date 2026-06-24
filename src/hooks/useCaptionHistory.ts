import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CaptionHistoryEntry {
  id: string;
  post_id: string;
  caption: string | null;
  edited_by: string | null;
  created_at: string;
  editor_name?: string | null;
}

export function useCaptionHistory(postId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['caption-history', postId],
    enabled: !!postId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_caption_history')
        .select('id, post_id, caption, edited_by, created_at')
        .eq('post_id', postId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = (data || []) as CaptionHistoryEntry[];

      const editorIds = Array.from(
        new Set(rows.map((r) => r.edited_by).filter((v): v is string => !!v))
      );
      if (editorIds.length === 0) return rows;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', editorIds);

      const nameMap = new Map((profiles || []).map((p) => [p.id, p.full_name]));
      return rows.map((r) => ({
        ...r,
        editor_name: r.edited_by ? nameMap.get(r.edited_by) ?? null : null,
      }));
    },
  });
}
