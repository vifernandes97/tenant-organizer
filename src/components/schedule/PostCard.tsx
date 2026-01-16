import { PostWithImages } from '@/hooks/usePosts';
import { PostStatusBadge } from './PostStatusBadge';
import { ChannelBadges } from '@/components/clients/ChannelBadges';
import { Image } from 'lucide-react';

interface PostCardProps {
  post: PostWithImages;
  onClick: () => void;
}

export function PostCard({ post, onClick }: PostCardProps) {
  const hasImages = post.post_images && post.post_images.length > 0;
  const firstImage = hasImages ? post.post_images[0].image_url : null;

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
            <ChannelBadges channels={[post.channel]} size="sm" />
            <span className="truncate text-xs text-muted-foreground">
              {post.clients?.name}
            </span>
          </div>
          {post.caption && (
            <p className="mt-0.5 truncate text-xs text-foreground">
              {post.caption.substring(0, 30)}
              {post.caption.length > 30 ? '...' : ''}
            </p>
          )}
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <PostStatusBadge status={post.status} showIcon={false} />
        <span className="text-[10px] text-muted-foreground">
          {new Date(post.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
