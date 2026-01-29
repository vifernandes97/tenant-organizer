import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PostWithImages, useDeletePost, useUpdatePostStatus } from '@/hooks/usePosts';
import { PostStatusBadge } from './PostStatusBadge';
import { ChannelBadges } from '@/components/clients/ChannelBadges';
import { Calendar, Clock, Edit, Trash2, Copy, Image } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type PostStatus = Database['public']['Enums']['post_status'];

interface PostDetailsProps {
  post: PostWithImages | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

export function PostDetails({ post, open, onOpenChange, onEdit }: PostDetailsProps) {
  const deletePost = useDeletePost();
  const updateStatus = useUpdatePostStatus();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!post) return null;

  const scheduledDate = new Date(post.scheduled_at);
  const images = post.post_images || [];

  const handleDelete = async () => {
    await deletePost.mutateAsync(post.id);
    onOpenChange(false);
  };

  const handleStatusChange = async (status: PostStatus) => {
    await updateStatus.mutateAsync({ id: post.id, status });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center justify-between pr-8">
            <SheetTitle className="flex items-center gap-2">
              <ChannelBadges channels={[post.channel]} />
              {post.clients?.name}
            </SheetTitle>
            <PostStatusBadge status={post.status} />
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Image Gallery */}
          {images.length > 0 && (
            <div className="space-y-2">
              <div className="relative flex items-center justify-center overflow-hidden rounded-lg bg-muted max-h-[500px]">
                <img
                  src={images[currentImageIndex]?.image_url}
                  alt=""
                  className="max-h-[500px] w-full object-contain"
                />
                {images.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`h-2 w-2 rounded-full transition-colors ${
                          idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1 overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`h-12 w-12 flex-shrink-0 overflow-hidden rounded ${
                      idx === currentImageIndex ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {images.length === 0 && (
            <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
              <div className="text-center text-muted-foreground">
                <Image className="mx-auto h-12 w-12" />
                <p className="mt-2 text-sm">Sem imagens</p>
              </div>
            </div>
          )}

          {/* Schedule Info */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {scheduledDate.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <Separator />

          {/* Caption */}
          <div>
            <h4 className="mb-2 text-sm font-medium">Legenda</h4>
            {post.caption ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{post.caption}</p>
            ) : (
              <p className="text-sm italic text-muted-foreground">Sem legenda</p>
            )}
          </div>

          <Separator />

          {/* Quick Status Change */}
          <div>
            <h4 className="mb-2 text-sm font-medium">Alterar Status</h4>
            <Select value={post.status} onValueChange={(v) => handleStatusChange(v as PostStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="scheduled">Agendado</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="text-xs text-muted-foreground">
            <p>Criado em: {new Date(post.created_at).toLocaleString('pt-BR')}</p>
            <p>Atualizado em: {new Date(post.updated_at).toLocaleString('pt-BR')}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={onEdit} className="flex-1">
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button variant="outline" size="icon">
              <Copy className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir Post?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O post e todas as imagens serão excluídos permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
