import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CommentItem } from './CommentItem';
import { CommentForm } from './CommentForm';
import { useAllPostComments, useCreateComment, type PostCommentWithAuthor, type CommentStatus } from '@/hooks/useComments';
import { MessageSquare, CircleDot, CheckCircle, Filter, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommentsListProps {
  postId: string;
  images?: { id: string; image_url: string }[];
  activeCommentId?: string | null;
  onCommentClick?: (comment: PostCommentWithAuthor, imageIndex?: number) => void;
}

type FilterType = 'all' | 'open' | 'resolved';

export function CommentsList({ 
  postId, 
  images = [],
  activeCommentId,
  onCommentClick,
}: CommentsListProps) {
  const { data: comments = [], isLoading } = useAllPostComments(postId);
  const createComment = useCreateComment();
  const [filter, setFilter] = useState<FilterType>('all');
  const [isComposing, setIsComposing] = useState(false);

  const handleCreateGeneralComment = (content: string) => {
    createComment.mutate(
      {
        post_id: postId,
        image_id: null,
        content,
        x_position: null,
        y_position: null,
      },
      { onSuccess: () => setIsComposing(false) }
    );
  };

  const filteredComments = comments.filter(comment => {
    if (filter === 'all') return true;
    return comment.status === filter;
  });

  const counts = {
    all: comments.length,
    open: comments.filter(c => c.status === 'open').length,
    resolved: comments.filter(c => c.status === 'resolved').length,
  };

  const getImageIndex = (imageId: string | null): number | undefined => {
    if (!imageId) return undefined;
    const index = images.findIndex(img => img.id === imageId);
    return index >= 0 ? index + 1 : undefined;
  };

  const handleCommentClick = (comment: PostCommentWithAuthor) => {
    const imageIndex = comment.image_id 
      ? images.findIndex(img => img.id === comment.image_id)
      : undefined;
    onCommentClick?.(comment, imageIndex !== undefined && imageIndex >= 0 ? imageIndex : undefined);
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Carregando comentários...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* New comment composer */}
      <div className="shrink-0 border-b p-2">
        {isComposing ? (
          <CommentForm
            onSubmit={handleCreateGeneralComment}
            onCancel={() => setIsComposing(false)}
            placeholder="Escreva um comentário geral sobre o post..."
            autoFocus
            compact
            isLoading={createComment.isPending}
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-full justify-start text-xs"
            onClick={() => setIsComposing(true)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Adicionar comentário
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex shrink-0 gap-1 border-b p-2">
        <Button
          variant={filter === 'all' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 flex-1 text-xs"
          onClick={() => setFilter('all')}
        >
          <Filter className="mr-1 h-3 w-3" />
          Todos ({counts.all})
        </Button>
        <Button
          variant={filter === 'open' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 flex-1 text-xs"
          onClick={() => setFilter('open')}
        >
          <CircleDot className="mr-1 h-3 w-3" />
          Abertos ({counts.open})
        </Button>
        <Button
          variant={filter === 'resolved' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 flex-1 text-xs"
          onClick={() => setFilter('resolved')}
        >
          <CheckCircle className="mr-1 h-3 w-3" />
          Resolvidos ({counts.resolved})
        </Button>
      </div>

      {/* Comments List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3">
          {filteredComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="mb-2 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {filter === 'all' 
                  ? 'Nenhum comentário ainda' 
                  : `Nenhum comentário ${filter === 'open' ? 'aberto' : 'resolvido'}`
                }
              </p>
              {filter === 'all' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Clique na imagem para adicionar
                </p>
              )}
            </div>
          ) : (
            filteredComments.map((comment, index) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                number={index + 1}
                isActive={activeCommentId === comment.id}
                onClick={() => handleCommentClick(comment)}
                imageNumber={getImageIndex(comment.image_id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
