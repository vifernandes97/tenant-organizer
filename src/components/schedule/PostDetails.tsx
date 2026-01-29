import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PostWithImages, useDeletePost, useUpdatePost, useUpdatePostStatus } from '@/hooks/usePosts';
import { useClients } from '@/hooks/useClients';
import { PostStatusBadge } from './PostStatusBadge';
import { ChannelBadges } from '@/components/clients/ChannelBadges';
import { FullscreenViewer } from './FullscreenViewer';
import { InlineEditable } from '@/components/ui/inline-editable';
import { InlineRichTextEditor } from '@/components/ui/inline-rich-text-editor';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Calendar, Clock, Edit, Trash2, Copy, Image, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type PostStatus = Database['public']['Enums']['post_status'];
type SocialChannel = Database['public']['Enums']['social_channel'];

const CHANNEL_OPTIONS = [
  { value: 'instagram_feed', label: 'Instagram Feed' },
  { value: 'instagram_story', label: 'Instagram Story' },
  { value: 'instagram_reels', label: 'Instagram Reels' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'wordpress', label: 'WordPress' },
];

interface PostDetailsProps {
  post: PostWithImages | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

export function PostDetails({ post, open, onOpenChange, onEdit }: PostDetailsProps) {
  const deletePost = useDeletePost();
  const updatePost = useUpdatePost();
  const updateStatus = useUpdatePostStatus();
  const { data: clients = [] } = useClients();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);

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

  const handleFieldUpdate = async (field: string, value: string) => {
    setSavingField(field);
    try {
      await updatePost.mutateAsync({
        id: post.id,
        post: { [field]: value },
      });
    } finally {
      setSavingField(null);
    }
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // Format datetime for input
  const formatDateTimeForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Extract plain text from HTML for display
  const extractPlainText = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const displayCaption = post.caption ? extractPlainText(post.caption) : null;
  const captionLength = displayCaption?.length || 0;

  // Get client options for select
  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));

  // Get channel label for display
  const getChannelLabel = (channel: SocialChannel): string => {
    return CHANNEL_OPTIONS.find((c) => c.value === channel)?.label || channel;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[90vh] w-[90vw] max-w-[90vw] flex-col gap-0 overflow-hidden p-0">
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            {/* Left Column - Image Gallery (60%) */}
            <div className="relative flex h-[45vh] min-h-0 w-full flex-col bg-muted/30 lg:h-auto lg:flex-1 lg:w-3/5">
              {/* Main Image */}
              {images.length > 0 ? (
                <>
                  <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4">
                    <img
                      src={images[currentImageIndex]?.image_url}
                      alt=""
                      className="h-full w-full rounded-lg object-contain"
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
                    <div className="flex shrink-0 gap-2 overflow-x-auto border-t bg-background/50 p-4">
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
            <div className="flex min-h-0 flex-1 w-full flex-col border-t lg:w-2/5 lg:flex-none lg:border-l lg:border-t-0">
              {/* Header */}
              <div className="shrink-0 border-b p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Channel - Inline Editable */}
                    <div>
                      <h4 className="mb-1 text-xs font-medium text-muted-foreground">Canal</h4>
                      <InlineEditable
                        type="select"
                        value={post.channel}
                        displayValue={getChannelLabel(post.channel)}
                        options={CHANNEL_OPTIONS}
                        onSave={(value) => handleFieldUpdate('channel', value)}
                        isLoading={savingField === 'channel'}
                      />
                    </div>
                    
                    {/* Client - Inline Editable */}
                    <div>
                      <h4 className="mb-1 text-xs font-medium text-muted-foreground">Cliente</h4>
                      <InlineEditable
                        type="select"
                        value={post.client_id}
                        displayValue={post.clients?.name || 'Selecione'}
                        options={clientOptions}
                        onSave={(value) => handleFieldUpdate('client_id', value)}
                        isLoading={savingField === 'client_id'}
                      />
                    </div>
                  </div>
                  <PostStatusBadge status={post.status} />
                </div>
              </div>

              {/* Content with scroll */}
              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                {/* Schedule Info - Inline Editable */}
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">Data e Hora</h4>
                  <InlineEditable
                    type="datetime"
                    value={formatDateTimeForInput(scheduledDate)}
                    displayValue={`${scheduledDate.toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })} às ${scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                    onSave={(value) => handleFieldUpdate('scheduled_at', value)}
                    isLoading={savingField === 'scheduled_at'}
                  />
                </div>

                <Separator className="my-6" />

                {/* Caption - Inline Rich Text Editor */}
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
                  <InlineRichTextEditor
                    value={post.caption || ''}
                    onSave={(value) => handleFieldUpdate('caption', value)}
                    isLoading={savingField === 'caption'}
                    placeholder="Clique para adicionar legenda..."
                  />
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
                    Editar Completo
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

      {/* Caption Expanded Dialog with Rich Text Editor */}
      <Dialog open={captionDialogOpen} onOpenChange={setCaptionDialogOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col">
          <DialogHeader>
            <DialogTitle>Legenda</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden">
            <RichTextEditor
              value={post.caption || ''}
              onChange={(value) => handleFieldUpdate('caption', value)}
              placeholder="Digite a legenda..."
              maxLength={2200}
              className="h-full"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
