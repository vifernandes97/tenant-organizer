import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PostWithImages, useDeletePost, useUpdatePost, useUpdatePostStatus, useReorderPostImages, useDeletePostImage } from '@/hooks/usePosts';
import { useClients } from '@/hooks/useClients';
import { useAllPostComments, type PostCommentWithAuthor } from '@/hooks/useComments';
import { PostStatusDropdown } from './PostStatusDropdown';
import { FullscreenViewer } from './FullscreenViewer';
import { InlineEditable } from '@/components/ui/inline-editable';
import { InlineRichTextEditor } from '@/components/ui/inline-rich-text-editor';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { ImageCommentLayer } from '@/components/comments/ImageCommentLayer';
import { CommentsList } from '@/components/comments/CommentsList';
import { Calendar, Clock, Edit, Trash2, Copy, Image, Maximize2, ChevronLeft, ChevronRight, MessageSquare, Download, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { downloadPostFilesAsZip, buildZipName, getFileNameFromUrl } from '@/lib/downloadZip';
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
  const queryClient = useQueryClient();
  const deletePost = useDeletePost();
  const updatePost = useUpdatePost();
  const updateStatus = useUpdatePostStatus();
  const reorderImages = useReorderPostImages();
  const deleteImage = useDeletePostImage();
  const { data: clients = [] } = useClients();
  const { data: comments = [] } = useAllPostComments(post?.id || null);
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const [captionSaving, setCaptionSaving] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('details');
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [localImages, setLocalImages] = useState(post?.post_images || []);

  useEffect(() => {
    setLocalImages(post?.post_images || []);
  }, [post?.post_images]);

  if (!post) return null;

  const scheduledDate = new Date(post.scheduled_at);
  const images = localImages;
  const openCommentsCount = comments.filter(c => c.status === 'open').length;

  const handleDelete = async () => {
    await deletePost.mutateAsync(post.id);
    onOpenChange(false);
  };

  const handleStatusChange = async (status: PostStatus, customStatusId?: string) => {
    const updateData: Record<string, any> = { id: post.id, status };
    if (customStatusId !== undefined) {
      await supabase.from('posts').update({ custom_status_id: customStatusId, status }).eq('id', post.id);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post'] });
      return;
    }
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

  const handleCommentClick = (comment: PostCommentWithAuthor, imageIndex?: number) => {
    setActiveCommentId(comment.id);
    if (imageIndex !== undefined) {
      setCurrentImageIndex(imageIndex);
    }
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
            {/* Left Column - Image Gallery with Comments (60%) */}
            <div className="relative flex h-[45vh] min-h-0 w-full flex-col bg-muted/30 lg:h-auto lg:flex-1 lg:w-3/5">
              {/* Main Image with Comment Layer */}
              {images.length > 0 ? (
                <>
                  <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4">
                    <ImageCommentLayer
                      postId={post.id}
                      imageId={images[currentImageIndex]?.id || null}
                      imageUrl={images[currentImageIndex]?.image_url}
                      className="h-full w-full"
                      activeCommentId={activeCommentId}
                      onCommentClick={(comment) => setActiveCommentId(comment.id)}
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
                    <div className="flex shrink-0 items-center overflow-x-auto border-t bg-background/50 p-4 gap-0">
                      {images.map((img, idx) => {
                        const showLeftBar = dragOverIndex === idx && dragIndex !== null && dragIndex > idx && dragIndex !== idx;
                        const showRightBar = dragOverIndex === idx && dragIndex !== null && dragIndex < idx && dragIndex !== idx;
                        return (
                          <div key={img.id} className="relative flex items-center px-1 group/thumb">
                            {showLeftBar && (
                              <div className="absolute -left-0.5 top-0 bottom-0 w-[3px] bg-primary rounded-full animate-pulse z-10" />
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = localImages.filter(i => i.id !== img.id);
                                setLocalImages(updated);
                                if (currentImageIndex >= updated.length) {
                                  setCurrentImageIndex(Math.max(0, updated.length - 1));
                                }
                                deleteImage.mutate(img.id);
                              }}
                              className="absolute -top-1 -right-0 z-20 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <button
                              draggable
                              onDragStart={() => setDragIndex(idx)}
                              onDragOver={(e) => { e.preventDefault(); setDragOverIndex(idx); }}
                              onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (dragIndex === null || dragIndex === idx) return;
                                const reordered = [...localImages];
                                const [moved] = reordered.splice(dragIndex, 1);
                                reordered.splice(idx, 0, moved);
                                setLocalImages(reordered);
                                reorderImages.mutate(
                                  reordered.map((img, i) => ({ id: img.id, display_order: i }))
                                );
                                setDragIndex(null);
                                setDragOverIndex(null);
                              }}
                              onClick={() => setCurrentImageIndex(idx)}
                              className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg transition-all cursor-grab active:cursor-grabbing ${
                                idx === currentImageIndex 
                                  ? 'ring-2 ring-primary ring-offset-2' 
                                  : 'opacity-60 hover:opacity-100'
                              } ${dragIndex === idx ? 'opacity-40' : ''}`}
                            >
                              <img src={img.image_url} alt="" className="h-full w-full object-cover pointer-events-none" />
                            </button>
                            {showRightBar && (
                              <div className="absolute -right-0.5 top-0 bottom-0 w-[3px] bg-primary rounded-full animate-pulse z-10" />
                            )}
                          </div>
                        );
                      })}
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

            {/* Right Column - Info Panel with Tabs (40%) */}
            <div className="flex min-h-0 flex-1 w-full flex-col border-t lg:w-2/5 lg:flex-none lg:border-l lg:border-t-0">
              {/* Header with Status */}
              <div className="shrink-0 border-b p-4">
                <div className="flex items-center justify-between">
                  <PostStatusDropdown 
                    status={post.status} 
                    customStatusId={(post as any).custom_status_id}
                    onStatusChange={handleStatusChange}
                    isLoading={updateStatus.isPending}
                    channel={post.channel}
                    clientId={post.client_id}
                  />
                  <span className="text-xs text-muted-foreground">
                    {post.clients?.name}
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
                <TabsList className="mx-4 mt-4 shrink-0 grid w-auto grid-cols-2">
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                  <TabsTrigger value="comments" className="gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Comentários
                    {openCommentsCount > 0 && (
                      <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground">
                        {openCommentsCount}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Details Tab */}
                <TabsContent value="details" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
                  {/* Content with scroll */}
                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {/* Title */}
                    <div className="mb-4">
                      <h4 className="mb-1 text-xs font-medium text-muted-foreground">Título</h4>
                      <InlineEditable
                        type="text"
                        value={post.title || ''}
                        placeholder="Sem título"
                        onSave={(value) => handleFieldUpdate('title', value)}
                        isLoading={savingField === 'title'}
                      />
                    </div>

                    {/* Channel */}
                    <div className="mb-4">
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
                    
                    {/* Client */}
                    <div className="mb-4">
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

                    {/* Schedule Info */}
                    <div className="mb-4">
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

                    <Separator className="my-4" />

                    {/* Caption */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-xs font-medium text-muted-foreground">Legenda</h4>
                        {post.caption && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCaptionDraft(post.caption || '');
                              setCaptionDialogOpen(true);
                            }}
                            className="h-6 px-2 text-xs"
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

                    <Separator className="my-4" />

                    {/* Quick Status Change */}
                    <div>
                      <h4 className="mb-2 text-xs font-medium text-muted-foreground">Alterar Status</h4>
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
                  <div className="shrink-0 border-t bg-background p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    {/* Metadata */}
                    <div className="mb-3 text-xs text-muted-foreground">
                      <p>Criado: {new Date(post.created_at).toLocaleString('pt-BR')}</p>
                      <p>Atualizado: {new Date(post.updated_at).toLocaleString('pt-BR')}</p>
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
                      {images.length > 0 && (
                        <Button
                          variant="outline"
                          size="icon"
                          title="Baixar arquivos"
                          disabled={isDownloading}
                          onClick={async () => {
                            setIsDownloading(true);
                            try {
                              const files = images.map((img, i) => ({
                                url: img.image_url,
                                name: getFileNameFromUrl(img.image_url, i),
                              }));
                              const zipName = buildZipName(
                                post.clients?.name || 'post',
                                scheduledDate,
                                post.channel
                              );
                              await downloadPostFilesAsZip(files, zipName);
                            } finally {
                              setIsDownloading(false);
                            }
                          }}
                        >
                          {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </Button>
                      )}
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
                </TabsContent>

                {/* Comments Tab */}
                <TabsContent value="comments" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
                  <CommentsList
                    postId={post.id}
                    images={images}
                    activeCommentId={activeCommentId}
                    onCommentClick={handleCommentClick}
                  />
                </TabsContent>
              </Tabs>
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
          <div className="min-h-0 flex-1">
            <RichTextEditor
              value={post.caption || ''}
              onChange={(value) => handleFieldUpdate('caption', value)}
              placeholder="Digite a legenda..."
              maxLength={10000}
              className="h-full"
              maxHeight="calc(85vh - 180px)"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
