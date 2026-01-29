import { useState } from 'react';
import { CommentPin } from './CommentPin';
import { CommentPopover } from './CommentPopover';
import { CommentForm } from './CommentForm';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useComments, useCreateComment, type PostCommentWithAuthor } from '@/hooks/useComments';
import { cn } from '@/lib/utils';

interface ImageCommentLayerProps {
  postId: string;
  imageId: string | null;
  imageUrl: string;
  className?: string;
  activeCommentId?: string | null;
  onCommentClick?: (comment: PostCommentWithAuthor) => void;
  disabled?: boolean;
}

export function ImageCommentLayer({
  postId,
  imageId,
  imageUrl,
  className,
  activeCommentId,
  onCommentClick,
  disabled = false,
}: ImageCommentLayerProps) {
  const { data: comments = [] } = useComments(postId, imageId);
  const createComment = useCreateComment();
  
  const [newCommentPosition, setNewCommentPosition] = useState<{ x: number; y: number } | null>(null);
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    
    // Don't create comment if clicking on existing pin
    if ((e.target as HTMLElement).closest('button')) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setNewCommentPosition({ x, y });
  };

  const handleCreateComment = (content: string) => {
    if (!newCommentPosition) return;
    
    createComment.mutate({
      post_id: postId,
      image_id: imageId,
      content,
      x_position: newCommentPosition.x,
      y_position: newCommentPosition.y,
    });
    
    setNewCommentPosition(null);
  };

  const handleReply = (comment: PostCommentWithAuthor, content: string) => {
    createComment.mutate({
      post_id: postId,
      image_id: imageId,
      content,
      parent_id: comment.id,
    });
  };

  const handlePinClick = (comment: PostCommentWithAuthor) => {
    setOpenCommentId(comment.id);
    onCommentClick?.(comment);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Image */}
      <img
        src={imageUrl}
        alt=""
        className="h-full w-full rounded-lg object-contain"
      />

      {/* Clickable overlay */}
      <div
        className={cn(
          "absolute inset-0 rounded-lg",
          !disabled && "cursor-crosshair"
        )}
        onClick={handleImageClick}
      >
        {/* Existing comment pins */}
        {comments.map((comment, index) => (
          <CommentPopover
            key={comment.id}
            comment={comment}
            number={index + 1}
            open={openCommentId === comment.id}
            onOpenChange={(open) => setOpenCommentId(open ? comment.id : null)}
            onReply={(content) => handleReply(comment, content)}
          >
            <div>
              <CommentPin
                number={index + 1}
                x={comment.x_position ?? 50}
                y={comment.y_position ?? 50}
                status={comment.status}
                isActive={activeCommentId === comment.id}
                preview={comment.content}
                onClick={() => handlePinClick(comment)}
              />
            </div>
          </CommentPopover>
        ))}

        {/* New comment popover */}
        {newCommentPosition && (
          <Popover 
            open={true} 
            onOpenChange={(open) => !open && setNewCommentPosition(null)}
          >
            <PopoverTrigger asChild>
              <button
                className="absolute z-20 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-lg ring-2 ring-offset-2 ring-offset-background animate-pulse"
                style={{
                  left: `${newCommentPosition.x}%`,
                  top: `${newCommentPosition.y}%`,
                }}
              >
                +
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-3">
                <p className="text-sm font-medium">Novo comentário</p>
                <CommentForm
                  onSubmit={handleCreateComment}
                  onCancel={() => setNewCommentPosition(null)}
                  placeholder="Digite seu comentário..."
                  autoFocus
                  isLoading={createComment.isPending}
                />
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Instructions overlay - show when no comments and not disabled */}
      {!disabled && comments.length === 0 && !newCommentPosition && (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-4">
          <div className="rounded-full bg-background/80 px-3 py-1.5 text-xs text-muted-foreground shadow-lg backdrop-blur">
            Clique na imagem para adicionar um comentário
          </div>
        </div>
      )}
    </div>
  );
}
