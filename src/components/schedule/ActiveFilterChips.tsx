import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useClients } from '@/hooks/useClients';
import type { Database } from '@/integrations/supabase/types';

type PostStatus = Database['public']['Enums']['post_status'];
type SocialChannel = Database['public']['Enums']['social_channel'];

interface ActiveFilterChipsProps {
  clientId: string | undefined;
  status: PostStatus[];
  channel: SocialChannel[];
  onClientChange: (clientId: string | undefined) => void;
  onStatusChange: (status: PostStatus[]) => void;
  onChannelChange: (channel: SocialChannel[]) => void;
  onClear: () => void;
}

const STATUS_LABEL: Record<PostStatus, string> = {
  draft: 'Rascunho',
  ai_generated: 'Gerado por IA',
  reviewed: 'Revisado',
  approved: 'Aprovado',
  scheduled: 'Agendado',
  published: 'Publicado',
};

const CHANNEL_LABEL: Record<SocialChannel, string> = {
  instagram_feed: 'Instagram Feed',
  instagram_story: 'Instagram Story',
  instagram_reels: 'Instagram Reels',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  twitter: 'Twitter',
  youtube: 'YouTube',
  wordpress: 'WordPress',
};

export function ActiveFilterChips({
  clientId,
  status,
  channel,
  onClientChange,
  onStatusChange,
  onChannelChange,
  onClear,
}: ActiveFilterChipsProps) {
  const { data: clients = [] } = useClients();
  const hasFilters = !!clientId || status.length > 0 || channel.length > 0;

  if (!hasFilters) return null;

  const clientName = clientId ? clients.find((c) => c.id === clientId)?.name : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Filtros ativos:</span>

      {clientName && (
        <Badge variant="secondary" className="gap-1 pr-1">
          <span className="text-xs">Cliente: {clientName}</span>
          <button
            onClick={() => onClientChange(undefined)}
            className="ml-1 rounded-sm hover:bg-background/40 p-0.5"
            aria-label="Remover filtro de cliente"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {status.map((s) => (
        <Badge key={s} variant="secondary" className="gap-1 pr-1">
          <span className="text-xs">Status: {STATUS_LABEL[s]}</span>
          <button
            onClick={() => onStatusChange(status.filter((x) => x !== s))}
            className="ml-1 rounded-sm hover:bg-background/40 p-0.5"
            aria-label={`Remover status ${STATUS_LABEL[s]}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {channel.map((c) => (
        <Badge key={c} variant="secondary" className="gap-1 pr-1">
          <span className="text-xs">Canal: {CHANNEL_LABEL[c]}</span>
          <button
            onClick={() => onChannelChange(channel.filter((x) => x !== c))}
            className="ml-1 rounded-sm hover:bg-background/40 p-0.5"
            aria-label={`Remover canal ${CHANNEL_LABEL[c]}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Button variant="ghost" size="sm" onClick={onClear} className="h-7 px-2 text-xs">
        Limpar tudo
      </Button>
    </div>
  );
}
