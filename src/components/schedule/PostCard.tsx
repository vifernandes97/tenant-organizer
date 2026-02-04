import { PostWithImages } from '@/hooks/usePosts';
import { PostStatusBadge } from './PostStatusBadge';
import { MessageSquare } from 'lucide-react';
import { extractPlainText } from '@/lib/textUtils';
import { ChannelBadges } from '@/components/clients/ChannelBadges';

interface PostCardProps {
  post: PostWithImages;
  onClick: () => void;
}

export function PostCard({ post, onClick }: PostCardProps) {
  // Use AI-generated title if available, otherwise extract plain text from caption
  const displayTitle = post.title || extractPlainText(post.caption || '').substring(0, 50);
  const openCommentsCount = post.open_comments_count || 0;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-md border bg-card p-2 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
    >
      {/* Title + Channel Icon */}
      <div className="flex items-center gap-1.5">
        <ChannelBadges channels={[post.channel]} iconOnly size="sm" />
        <p className="truncate text-sm text-foreground font-medium flex-1">
          {displayTitle || 'Sem título'}
        </p>
      </div>
      
      {/* Status + Comments */}
      <div className="mt-1.5 flex items-center justify-between">
        <PostStatusBadge status={post.status} showIcon={false} />
        
        {openCommentsCount > 0 && (
          <div className="flex items-center gap-1 text-primary">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{openCommentsCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
