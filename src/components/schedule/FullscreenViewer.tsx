import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Image, Type } from 'lucide-react';
import { PostWithImages, useUpdatePost } from '@/hooks/usePosts';
import { cn } from '@/lib/utils';

interface FullscreenViewerProps {
  post: PostWithImages;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

type ViewMode = 'image' | 'editor';

export function FullscreenViewer({ post, open, onOpenChange, onSaved }: FullscreenViewerProps) {
  const images = post.post_images || [];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [caption, setCaption] = useState(post.caption || '');
  const [viewMode, setViewMode] = useState<ViewMode>('image');
  const updatePost = useUpdatePost();

  useEffect(() => {
    setCaption(post.caption || '');
    setCurrentImageIndex(0);
    setViewMode('image');
  }, [post]);

  const goToPrevious = useCallback(() => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      // Only handle arrow keys in image mode
      if (viewMode === 'image') {
        if (e.key === 'ArrowLeft') goToPrevious();
        if (e.key === 'ArrowRight') goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, viewMode, goToPrevious, goToNext]);

  const handleSave = async () => {
    await updatePost.mutateAsync({
      id: post.id,
      post: { caption },
    });
    onSaved?.();
    onOpenChange(false);
  };

  const handleCancel = () => {
    setCaption(post.caption || '');
    onOpenChange(false);
  };

  const hasChanges = caption !== (post.caption || '');
  const maxChars = 2200;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[95vh] max-h-[95vh] w-[95vw] max-w-[95vw] flex-col gap-0 p-0">
        <DialogHeader className="flex-shrink-0 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Visualização em Tela Cheia</DialogTitle>
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <Button
                variant={viewMode === 'image' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('image')}
                className="gap-2"
              >
                <Image className="h-4 w-4" />
                Imagem
              </Button>
              <Button
                variant={viewMode === 'editor' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('editor')}
                className="gap-2"
              >
                <Type className="h-4 w-4" />
                Editor
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          {viewMode === 'image' ? (
            /* Image Mode - Full Screen */
            <div className="relative flex flex-1 flex-col bg-black/95">
            {/* Main Image */}
            <div className="relative flex-1 overflow-hidden">
              {images.length > 0 ? (
                <>
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <img
                      src={images[currentImageIndex]?.image_url}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                    {/* Navigation Arrows */}
                    {images.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={goToPrevious}
                          className="absolute left-4 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
                        >
                          <ChevronLeft className="h-8 w-8" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={goToNext}
                          className="absolute right-4 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
                        >
                          <ChevronRight className="h-8 w-8" />
                        </Button>

                        {/* Image Counter */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1 text-sm text-white">
                          {currentImageIndex + 1} / {images.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground">Sem imagens</div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto bg-black/80 p-4">
                  {images.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={cn(
                        'h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg transition-all',
                        idx === currentImageIndex
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-black'
                          : 'opacity-60 hover:opacity-100'
                      )}
                    >
                      <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Editor Mode - Full Screen */
            <div className="flex flex-1 flex-col bg-background">
              <div className="flex flex-1 flex-col p-6">
                <h3 className="mb-4 text-sm font-medium">Legenda</h3>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Digite a legenda do post..."
                  className="flex-1 resize-none text-base leading-relaxed"
                  maxLength={maxChars}
                />
                <div className="mt-2 text-right text-sm text-muted-foreground">
                  {caption.length}/{maxChars} caracteres
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 border-t p-6">
                <Button variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updatePost.isPending || !hasChanges}
                >
                  {updatePost.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
