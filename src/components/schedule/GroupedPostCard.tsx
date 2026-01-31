import { PostGroup } from '@/hooks/useGroupedPosts';
import { PostStatusBadge } from './PostStatusBadge';
import { ChannelBadges } from '@/components/clients/ChannelBadges';
import { Image } from 'lucide-react';
import { extractPlainText } from '@/lib/textUtils';

interface GroupedPostCardProps {
  group: PostGroup;
  onClick: () => void;
}

export function GroupedPostCard({ group, onClick }: GroupedPostCardProps) {
  const { posts, channels, clientName, title, firstImage, scheduledAt } = group;

  // Use the primary post (first one) for status display
  const primaryPost = posts[0];
  
  // Use AI-generated title if available, otherwise extract from caption
  const displayTitle = title || extractPlainText(primaryPost.caption || '').substring(0, 40);

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-md border bg-card p-2 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
    >
      <div className="flex items-start gap-2">
        {firstImage ? (
          <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded">
            <img src={firstImage} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-muted">
            <Image className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            {/* Show all channel icons for the group */}
            <ChannelBadges channels={channels} iconOnly />
            <span className="truncate text-xs text-muted-foreground">
              {clientName}
            </span>
          </div>
          {displayTitle && (
            <p className="mt-0.5 truncate text-xs text-foreground">
              {displayTitle}
              {!title && displayTitle.length >= 40 ? '...' : ''}
            </p>
          )}
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <PostStatusBadge status={primaryPost.status} showIcon={false} />
          {posts.length > 1 && (
            <span className="text-[10px] text-muted-foreground">
              ({posts.length} canais)
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {new Date(scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
