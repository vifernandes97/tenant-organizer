import { Video, FileText, Image as ImageIcon, MessageSquare, Calendar, Inbox, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';
import { ChannelBadges } from '@/components/clients/ChannelBadges';
import { PostStatusBadge } from './PostStatusBadge';
import { extractPlainText } from '@/lib/textUtils';

type SocialChannel = Database['public']['Enums']['social_channel'];
type PostStatus = Database['public']['Enums']['post_status'];

interface PostHoverPreviewProps {
  title?: string | null;
  caption?: string | null;
  image?: string | null;
  mediaType?: string | null;
  channels: SocialChannel[];
  status: PostStatus;
  customStatusId?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  scheduledAt?: string | null;
  openComments?: number;
  postsCount?: number;
}

export function PostHoverPreview({
  title,
  caption,
  image,
  mediaType,
  channels,
  status,
  customStatusId,
  clientId,
  clientName,
  scheduledAt,
  openComments = 0,
  postsCount,
}: PostHoverPreviewProps) {
  const isImage = !!image && (!mediaType || mediaType.startsWith('image'));
  const isVideo = mediaType?.startsWith('video');
  const isPdf = mediaType?.includes('pdf');

  const displayTitle = title || extractPlainText(caption || '').substring(0, 60) || 'Sem título';
  const captionSnippet = extractPlainText(caption || '').substring(0, 150);

  const formattedDate = scheduledAt
    ? format(new Date(scheduledAt), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })
    : null;

  return (
    <div className="overflow-hidden rounded-md">
      {/* Media */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted flex items-center justify-center">
        {isImage ? (
          <img src={image!} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : isVideo ? (
          <Video className="h-10 w-10 text-muted-foreground" />
        ) : isPdf ? (
          <FileText className="h-10 w-10 text-muted-foreground" />
        ) : (
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
        )}
      </div>

      {/* Body */}
      <div className="space-y-2.5 p-3">
        <h4 className="text-sm font-semibold leading-snug text-foreground">{displayTitle}</h4>

        {clientName && (
          <p className="text-xs text-muted-foreground">{clientName}</p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <PostStatusBadge status={status} customStatusId={customStatusId} clientId={clientId} />
          {postsCount && postsCount > 1 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
              <Layers className="h-3 w-3" />
              {postsCount} posts
            </span>
          )}
        </div>

        <ChannelBadges channels={channels} />

        {captionSnippet && (
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {captionSnippet}
            {(caption && extractPlainText(caption).length > 150) ? '…' : ''}
          </p>
        )}

        <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            {formattedDate ? (
              <>
                <Calendar className="h-3.5 w-3.5" />
                {formattedDate}
              </>
            ) : (
              <>
                <Inbox className="h-3.5 w-3.5" />
                Backlog
              </>
            )}
          </span>
          {openComments > 0 && (
            <span className="inline-flex items-center gap-1 text-primary">
              <MessageSquare className="h-3.5 w-3.5" />
              {openComments}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
