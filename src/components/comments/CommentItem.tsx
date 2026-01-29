import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useResolveComment, useDeleteComment, type PostCommentWithAuthor } from '@/hooks/useComments';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, RotateCcw, Trash2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommentItemProps {
  comment: PostCommentWithAuthor;
  number: number;
  isActive?: boolean;
  onClick?: () => void;
  imageNumber?: number;
}

export function CommentItem({ 
  comment, 
  number, 
  isActive = false,
  onClick,
  imageNumber,
}: CommentItemProps) {
  const { user, userRole } = useAuth();
  const resolveComment = useResolveComment();
  const deleteComment = useDeleteComment();

  const isOwn = user?.id === comment.author_id;
  const isOwner = userRole?.role === 'owner';
  const canModify = isOwn || isOwner;
  const isResolved = comment.status === 'resolved';

  const handleResolve = (e: React.MouseEvent) => {
    e.stopPropagation();
    resolveComment.mutate({ id: comment.id, resolve: !isResolved });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteComment.mutate({ id: comment.id, postId: comment.post_id });
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-lg border p-3 transition-all hover:border-primary/50 hover:bg-accent/50",
        isActive && "border-primary bg-accent",
        isResolved && "opacity-75"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span 
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold",
              isResolved 
                ? "bg-green-500 text-white" 
                : "bg-primary text-primary-foreground"
            )}
          >
            {number}
          </span>
          {imageNumber !== undefined && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ImageIcon className="h-3 w-3" />
              {imageNumber}
            </span>
          )}
          <Badge 
            variant={isResolved ? 'secondary' : 'default'} 
            className="h-5 text-xs"
          >
            {isResolved ? 'Resolvido' : 'Aberto'}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(comment.created_at), { 
            addSuffix: true, 
            locale: ptBR 
          })}
        </span>
      </div>

      {/* Content */}
      <div className="mt-2 flex gap-2">
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarImage src={comment.author?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {getInitials(comment.author?.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium">{comment.author?.full_name || 'Usuário'}</p>
          <p className="mt-0.5 text-sm text-foreground line-clamp-2 whitespace-pre-wrap">
            {comment.content}
          </p>
        </div>
      </div>

      {/* Actions - show on hover */}
      <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleResolve}
          disabled={resolveComment.isPending}
        >
          {isResolved ? (
            <>
              <RotateCcw className="mr-1 h-3 w-3" />
              Reabrir
            </>
          ) : (
            <>
              <Check className="mr-1 h-3 w-3" />
              Resolver
            </>
          )}
        </Button>
        {canModify && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleteComment.isPending}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Excluir
          </Button>
        )}
      </div>

      {/* Resolution info */}
      {isResolved && comment.resolved_at && (
        <div className="mt-2 text-xs text-muted-foreground">
          Resolvido por {comment.resolver?.full_name || 'alguém'}{' '}
          {formatDistanceToNow(new Date(comment.resolved_at), { 
            addSuffix: true, 
            locale: ptBR 
          })}
        </div>
      )}
    </div>
  );
}
