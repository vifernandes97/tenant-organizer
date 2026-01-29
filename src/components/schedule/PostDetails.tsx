import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PostWithImages, useDeletePost, useUpdatePostStatus } from '@/hooks/usePosts';
import { PostStatusBadge } from './PostStatusBadge';
import { ChannelBadges } from '@/components/clients/ChannelBadges';
import { FullscreenViewer } from './FullscreenViewer';
import { Calendar, Clock, Edit, Trash2, Copy, Image, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false);

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

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // Extract plain text from HTML for display
  const extractPlainText = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const displayCaption = post.caption ? extractPlainText(post.caption) : null;
  const captionLength = displayCaption?.length || 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="h-[90vh] w-[90vw] max-w-[90vw] gap-0 overflow-hidden p-0">
          <div className="flex h-full flex-col lg:flex-row">
            {/* Left Column - Image Gallery (60%) */}
            <div className="relative flex w-full flex-col bg-muted/30 lg:w-3/5">
              {/* Main Image */}
              {images.length > 0 ? (
                <>
                  <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
                    <img
                      src={images[currentImageIndex]?.image_url}
                      alt=""
                      className="max-h-full max-w-full rounded-lg object-contain"
                    />
                    
                    {/* Navigation Arrows */}
                    {images.length > 1 && (
                      <>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={handlePrevImage}
                          className="absolute left-6 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-background/80 shadow-lg hover:bg-background"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={handleNextImage}
                          className="absolute right-6 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-background/80 shadow-lg hover:bg-background"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </>
                    )}

                    {/* Fullscreen Button */}
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => setFullscreenOpen(true)}
                      className="absolute right-6 top-6 h-9 w-9 rounded-full bg-background/80 shadow-lg hover:bg-background"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>

                    {/* Image Counter */}
                    {images.length > 1 && (
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-3 py-1 text-sm font-medium shadow-lg">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    )}
                  </div>

                  {/* Thumbnails */}
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto border-t bg-background/50 p-4">
                      {images.map((img, idx) => (
                        <button
                          key={img.id}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg transition-all ${
                            idx === currentImageIndex 
                              ? 'ring-2 ring-primary ring-offset-2' 
                              : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Image className="mx-auto h-16 w-16 opacity-50" />
                    <p className="mt-3 text-sm">Sem imagens</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Info Panel (40%) */}
            <div className="flex w-full flex-col border-t lg:w-2/5 lg:border-l lg:border-t-0">
              {/* Header */}
              <div className="border-b p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <ChannelBadges channels={[post.channel]} />
                    <h2 className="text-xl font-semibold">{post.clients?.name}</h2>
                  </div>
                  <PostStatusBadge status={post.status} />
                </div>
              </div>

              {/* Content with scroll */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Schedule Info */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      {scheduledDate.toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">
                      {scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Caption */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground">Legenda</h4>
                    {post.caption && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCaptionDialogOpen(true)}
                        className="h-7 px-2 text-xs"
                      >
                        <Maximize2 className="mr-1 h-3 w-3" />
                        Expandir
                      </Button>
                    )}
                  </div>
                  {displayCaption ? (
                    <div className="max-h-[200px] overflow-y-auto rounded-lg bg-muted/50 p-4">
                      <p className="whitespace-pre-wrap text-sm">{displayCaption}</p>
                    </div>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">Sem legenda</p>
                  )}
                </div>

                <Separator className="my-6" />

                {/* Quick Status Change */}
                <div>
                  <h4 className="mb-3 text-sm font-medium text-muted-foreground">Alterar Status</h4>
                  <Select value={post.status} onValueChange={(v) => handleStatusChange(v as PostStatus)}>
                    <SelectTrigger className="w-full">
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
              </div>

              {/* Footer - always visible */}
              <div className="shrink-0 border-t bg-background p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                {/* Metadata */}
                <div className="mb-4 text-xs text-muted-foreground">
                  <p>Criado em: {new Date(post.created_at).toLocaleString('pt-BR')}</p>
                  <p>Atualizado em: {new Date(post.updated_at).toLocaleString('pt-BR')}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={onEdit} className="flex-1">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button variant="outline" size="icon" title="Copiar">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon" title="Excluir">
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
            </div>
          </div>

          {/* Fullscreen Viewer */}
          <FullscreenViewer
            post={post}
            open={fullscreenOpen}
            onOpenChange={setFullscreenOpen}
          />
        </DialogContent>
      </Dialog>

      {/* Caption Expanded Dialog */}
      <Dialog open={captionDialogOpen} onOpenChange={setCaptionDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Legenda</DialogTitle>
          </DialogHeader>
          <div 
            className="prose prose-sm dark:prose-invert max-h-[60vh] overflow-y-auto rounded-lg bg-muted/30 p-4"
            dangerouslySetInnerHTML={{ __html: post.caption || '' }}
          />
          <div className="text-right text-sm text-muted-foreground">
            {captionLength} caracteres
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
