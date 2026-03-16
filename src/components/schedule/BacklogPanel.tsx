import { DragEvent, useState } from 'react';
import { PostGroup, groupPosts } from '@/hooks/useGroupedPosts';
import { PostWithImages } from '@/hooks/usePosts';
import { ChannelBadges } from '@/components/clients/ChannelBadges';
import { PostStatusBadge } from './PostStatusBadge';
import { extractPlainText } from '@/lib/textUtils';
import { MessageSquare, Inbox, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface BacklogPanelProps {
  posts: PostWithImages[];
  isLoading: boolean;
  onPostClick: (group: PostGroup) => void;
}

function BacklogCard({ group, onClick }: { group: PostGroup; onClick: () => void }) {
  const { posts, title, totalOpenComments } = group;
  const primaryPost = posts[0];
  const [isDragging, setIsDragging] = useState(false);
  const displayTitle = title || extractPlainText(primaryPost.caption || '').substring(0, 50);
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
      <div className="flex items-center gap-1.5">
        <ChannelBadges channels={channels} iconOnly size="sm" />
        <p className="truncate text-sm text-foreground font-medium flex-1">
          {displayTitle || 'Sem título'}
        </p>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <PostStatusBadge status={primaryPost.status} showIcon={false} />
        {totalOpenComments > 0 && (
          <div className="flex items-center gap-1 text-primary">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{totalOpenComments}</span>
          </div>
        )}
      </div>
      {primaryPost.clients?.name && (
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {primaryPost.clients.name}
        </p>
      )}
    </div>
  );
}

export function BacklogPanel({ posts, isLoading, onPostClick }: BacklogPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const groups = groupPosts(posts);

  return (
    <div className="flex w-64 shrink-0 flex-col rounded-lg border bg-card">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between border-b px-3 py-2.5"
      >
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Backlog</span>
          {posts.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {posts.length}
            </Badge>
          )}
        </div>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {!collapsed && (
        <ScrollArea className="flex-1">
          <div className="space-y-2 p-2">
            {isLoading ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Carregando...</p>
            ) : groups.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Nenhum post em backlog
              </p>
            ) : (
              groups.map((group) => (
                <BacklogCard
                  key={group.groupId}
                  group={group}
                  onClick={() => onPostClick(group)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
