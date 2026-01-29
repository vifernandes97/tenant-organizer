import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CommentForm } from './CommentForm';
import { useResolveComment, useDeleteComment, type PostCommentWithAuthor } from '@/hooks/useComments';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, RotateCcw, Trash2, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CommentPopoverProps {
  comment: PostCommentWithAuthor;
  number: number;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onReply?: (content: string) => void;
}

export function CommentPopover({ 
  comment, 
  number, 
  children, 
  open, 
  onOpenChange,
  onReply,
}: CommentPopoverProps) {
  const { user, userRole } = useAuth();
  const resolveComment = useResolveComment();
  const deleteComment = useDeleteComment();
  const [showReplyForm, setShowReplyForm] = useState(false);

  const isOwn = user?.id === comment.author_id;
  const isOwner = userRole?.role === 'owner';
  const canModify = isOwn || isOwner;

  const handleResolve = () => {
    resolveComment.mutate({ 
      id: comment.id, 
      resolve: comment.status !== 'resolved' 
    });
  };

  const handleDelete = () => {
    deleteComment.mutate({ id: comment.id, postId: comment.post_id });
    onOpenChange?.(false);
  };

  const handleReply = (content: string) => {
    onReply?.(content);
    setShowReplyForm(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {number}
            </span>
            <Badge variant={comment.status === 'resolved' ? 'secondary' : 'default'}>
              {comment.status === 'resolved' ? 'Resolvido' : 'Aberto'}
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
        <div className="p-3">
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={comment.author?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(comment.author?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {comment.author?.full_name || 'Usuário'}
              </p>
              <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          </div>

          {/* Resolution info */}
          {comment.status === 'resolved' && comment.resolved_at && (
            <div className="mt-3 rounded-md bg-green-50 p-2 text-xs text-green-700 dark:bg-green-950 dark:text-green-300">
              Resolvido por {comment.resolver?.full_name || 'alguém'}{' '}
              {formatDistanceToNow(new Date(comment.resolved_at), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3 border-l-2 border-muted pl-3">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="flex gap-2">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={reply.author?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(reply.author?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-xs font-medium">
                      {reply.author?.full_name || 'Usuário'}
                    </p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {reply.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reply Form */}
        {showReplyForm && (
          <>
            <Separator />
            <div className="p-3">
              <CommentForm
                onSubmit={handleReply}
                onCancel={() => setShowReplyForm(false)}
                placeholder="Responder..."
                autoFocus
                compact
              />
            </div>
          </>
        )}

        {/* Actions */}
        <Separator />
        <div className="flex items-center gap-1 p-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 flex-1"
            onClick={() => setShowReplyForm(true)}
          >
            <MessageSquare className="mr-1 h-3 w-3" />
            Responder
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 flex-1"
            onClick={handleResolve}
            disabled={resolveComment.isPending}
          >
            {comment.status === 'resolved' ? (
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
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={deleteComment.isPending}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
