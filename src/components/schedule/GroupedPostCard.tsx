import { useState, DragEvent } from 'react';
import { PostGroup } from '@/hooks/useGroupedPosts';
import { PostStatusBadge } from './PostStatusBadge';
import { MessageSquare } from 'lucide-react';
import { extractPlainText } from '@/lib/textUtils';
import { ChannelBadges } from '@/components/clients/ChannelBadges';

interface GroupedPostCardProps {
  group: PostGroup;
  onClick: () => void;
}

export function GroupedPostCard({ group, onClick }: GroupedPostCardProps) {
  const { posts, title, totalOpenComments } = group;
  const primaryPost = posts[0];
  const [isDragging, setIsDragging] = useState(false);
  
  // Use AI-generated title if available, otherwise extract from caption
  const displayTitle = title || extractPlainText(primaryPost.caption || '').substring(0, 50);
  
  // Collect all unique channels from the group
  const channels = posts.map(p => p.channel);

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      groupId: group.groupId,
      posts: posts.map(p => ({ id: p.id, scheduled_at: p.scheduled_at })),
    }));
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      className={`cursor-grab rounded-md border bg-card p-2 shadow-sm transition-all hover:shadow-md hover:border-primary/50 ${
        isDragging ? 'opacity-50 cursor-grabbing' : ''
      }`}
    >
      {/* Title + Channel Icons */}
      <div className="flex items-center gap-1.5">
        <ChannelBadges channels={channels} iconOnly size="sm" />
        <p className="truncate text-sm text-foreground font-medium flex-1">
          {displayTitle || 'Sem título'}
        </p>
      </div>
      
      {/* Status + Comments */}
      <div className="mt-1.5 flex items-center justify-between">
        <PostStatusBadge status={primaryPost.status} showIcon={false} customStatusId={primaryPost.custom_status_id} clientId={group.clientId} />
        
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
