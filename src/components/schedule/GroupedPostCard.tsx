import { PostGroup } from '@/hooks/useGroupedPosts';
import { PostStatusBadge } from './PostStatusBadge';
import { MessageSquare } from 'lucide-react';
import { extractPlainText } from '@/lib/textUtils';

interface GroupedPostCardProps {
  group: PostGroup;
  onClick: () => void;
}

export function GroupedPostCard({ group, onClick }: GroupedPostCardProps) {
  const { posts, title, totalOpenComments } = group;
  const primaryPost = posts[0];
  
  // Use AI-generated title if available, otherwise extract from caption
  const displayTitle = title || extractPlainText(primaryPost.caption || '').substring(0, 50);

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-md border bg-card p-2 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
    >
      {/* Title */}
      <p className="truncate text-sm text-foreground font-medium">
        {displayTitle || 'Sem título'}
      </p>
      
      {/* Status + Comments */}
      <div className="mt-1.5 flex items-center justify-between">
        <PostStatusBadge status={primaryPost.status} showIcon={false} />
        
        {totalOpenComments > 0 && (
          <div className="flex items-center gap-1 text-primary">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{totalOpenComments}</span>
          </div>
        )}
      </div>
    </div>
  );
}
