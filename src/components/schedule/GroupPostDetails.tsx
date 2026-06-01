import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PostWithImages, useDeletePost, useUpdatePost, useUpdatePostStatus, useTriggerWordPressWebhook, PROJECT_TYPES, useReorderPostImages, useDeletePostImage } from '@/hooks/usePosts';
import { PostGroup } from '@/hooks/useGroupedPosts';
import { useClients } from '@/hooks/useClients';
import { useAllPostComments, type PostCommentWithAuthor } from '@/hooks/useComments';
import { PostStatusDropdown } from './PostStatusDropdown';
import { FullscreenViewer } from './FullscreenViewer';
import { InlineEditable } from '@/components/ui/inline-editable';
import { InlineRichTextEditor } from '@/components/ui/inline-rich-text-editor';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { ImageCommentLayer } from '@/components/comments/ImageCommentLayer';
import { CommentsList } from '@/components/comments/CommentsList';
import { ChannelBadges } from '@/components/clients/ChannelBadges';
import { Edit, Trash2, Copy, Image, Maximize2, ChevronLeft, ChevronRight, MessageSquare, Play, Wand2, Loader2, Download, X } from 'lucide-react';
import { downloadPostFilesAsZip, buildZipName, getFileNameFromUrl } from '@/lib/downloadZip';
import { FilePreview, isDocumentFile, getFileIcon, getFileTypeLabel } from './FilePreview';
import type { Database } from '@/integrations/supabase/types';

type PostStatus = Database['public']['Enums']['post_status'];
type SocialChannel = Database['public']['Enums']['social_channel'];

const CHANNEL_OPTIONS: { value: SocialChannel; label: string }[] = [
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

interface GroupPostDetailsProps {
  group: PostGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

export function GroupPostDetails({ group, open, onOpenChange, onEdit }: GroupPostDetailsProps) {
  const queryClient = useQueryClient();
  const deletePost = useDeletePost();
  const updatePost = useUpdatePost();
  const updateStatus = useUpdatePostStatus();
  const triggerWebhook = useTriggerWordPressWebhook();
  const reorderImages = useReorderPostImages();
  const deleteImage = useDeletePostImage();
  const { data: clients = [] } = useClients();
  
  // Track active channel within the group
  const [activeChannel, setActiveChannel] = useState<string>('');
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
  const [localImages, setLocalImages] = useState<any[]>([]);

  // Get the current post based on active channel
  const activePost = useMemo(() => {
    if (!group) return null;
    if (group.posts.length === 1) return group.posts[0];
    return group.posts.find(p => p.channel === activeChannel) || group.posts[0];
  }, [group, activeChannel]);

  const { data: comments = [] } = useAllPostComments(activePost?.id || null);

  // Reset all local state when group changes
  useEffect(() => {
    if (group && group.posts.length > 0) {
      setActiveChannel(group.posts[0].channel);
      setCurrentImageIndex(0);
      setActiveTab('details');
      setActiveCommentId(null);
      setLocalImages(group.posts[0].post_images || []);
      setDragIndex(null);
      setDragOverIndex(null);
    }
  }, [group?.groupId]);

  // Sync local images and reset caption draft whenever the active channel/post changes
  useEffect(() => {
    if (!activePost) return;
    setLocalImages(activePost.post_images || []);
    setCurrentImageIndex(0);
    setCaptionDraft(activePost.caption || '');
    setDragIndex(null);
    setDragOverIndex(null);
  }, [activePost?.id]);

  if (!group || !activePost) return null;

  const scheduledDate = new Date(activePost.scheduled_at);
  const images = localImages;
  const openCommentsCount = comments.filter(c => c.status === 'open').length;
  const isMultiChannel = group.posts.length > 1;
  const isWordPress = activePost.channel === 'wordpress';

  const isVideoMedia = (media: { image_url: string; media_type?: string }) => {
    if (media.media_type === 'video') return true;
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    return videoExtensions.some(ext => media.image_url.toLowerCase().includes(ext));
  };

  const isDocMedia = (media: { image_url: string; media_type?: string }) => {
    const fileName = media.image_url.split('/').pop() || '';
    return isDocumentFile(fileName, media.media_type);
  };
  const handleDelete = async () => {
    // Delete only the active channel's post
    await deletePost.mutateAsync(activePost.id);
    
    // If there are more posts in the group, switch to another
    if (group.posts.length > 1) {
      const remaining = group.posts.filter(p => p.id !== activePost.id);
      if (remaining.length > 0) {
        setActiveChannel(remaining[0].channel);
      } else {
        onOpenChange(false);
      }
    } else {
      onOpenChange(false);
    }
  };

  const handleDeleteAll = async () => {
    // Delete all posts in the group
    for (const post of group.posts) {
      await deletePost.mutateAsync(post.id);
    }
    onOpenChange(false);
  };

  const handleStatusChange = async (status: PostStatus, customStatusId?: string) => {
    if (customStatusId !== undefined) {
      await supabase.from('posts').update({ custom_status_id: customStatusId, status }).eq('id', activePost.id);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post'] });
      return;
    }
    await updateStatus.mutateAsync({ id: activePost.id, status });
  };

  const handleFieldUpdate = async (field: string, value: string) => {
    setSavingField(field);
    try {
      await updatePost.mutateAsync({
        id: activePost.id,
        post: { [field]: value },
        silent: true,
      });
    } catch (error) {
      console.error(`Erro ao salvar ${field}:`, error);
      toast.error('Erro ao salvar alteração');
    } finally {
      setSavingField(null);
    }
  };

  // Update shared fields across all posts in the group
  const handleSharedFieldUpdate = async (field: 'client_id' | 'scheduled_at' | 'title', value: string) => {
    setSavingField(field);
    try {
      for (const post of group.posts) {
        await updatePost.mutateAsync({
          id: post.id,
          post: { [field]: value },
          silent: true,
        });
      }
    } catch (error) {
      console.error(`Erro ao salvar ${field}:`, error);
      toast.error('Erro ao salvar alteração');
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

  const formatDateTimeForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const extractPlainText = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));

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
              {images.length > 0 ? (
                <>
                  <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4">
                    {isVideoMedia(images[currentImageIndex]) ? (
                      <div className="relative h-full w-full flex items-center justify-center">
                        <video
                          src={images[currentImageIndex]?.image_url}
                          controls
                          className="max-h-full max-w-full rounded-lg"
                        />
                      </div>
                    ) : isDocMedia(images[currentImageIndex]) ? (
                      <div className="flex flex-col items-center justify-center p-8">
                        {(() => {
                          const fileName = images[currentImageIndex]?.image_url.split('/').pop() || 'arquivo';
                          const Icon = getFileIcon(fileName, images[currentImageIndex]?.media_type);
                          const label = getFileTypeLabel(fileName, images[currentImageIndex]?.media_type);
                          return (
                            <>
                              <Icon className="h-24 w-24 text-muted-foreground mb-4" />
                              <p className="text-lg font-medium text-foreground mb-1">{fileName}</p>
                              <p className="text-sm text-muted-foreground">{label}</p>
                              <a 
                                href={images[currentImageIndex]?.image_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mt-4 text-sm text-primary hover:underline"
                              >
                                Abrir arquivo
                              </a>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <ImageCommentLayer
                        postId={activePost.id}
                        imageId={images[currentImageIndex]?.id || null}
                        imageUrl={images[currentImageIndex]?.image_url}
                        className="h-full w-full"
                        activeCommentId={activeCommentId}
                        onCommentClick={(comment) => setActiveCommentId(comment.id)}
                      />
                    )}
                    
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

                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => setFullscreenOpen(true)}
                      className="absolute right-6 top-6 h-9 w-9 rounded-full bg-background/80 shadow-lg hover:bg-background"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>

                    {images.length > 1 && (
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-3 py-1 text-sm font-medium shadow-lg">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    )}
                  </div>

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
                              className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg transition-all relative cursor-grab active:cursor-grabbing ${
                                idx === currentImageIndex 
                                  ? 'ring-2 ring-primary ring-offset-2' 
                                  : 'opacity-60 hover:opacity-100'
                              } ${dragIndex === idx ? 'opacity-40' : ''}`}
                            >
                              {isVideoMedia(img) ? (
                                <>
                                  <video src={img.image_url} className="h-full w-full object-cover pointer-events-none" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="rounded-full bg-black/60 p-1">
                                      <Play className="h-3 w-3 text-white" fill="white" />
                                    </div>
                                  </div>
                                </>
                              ) : isDocMedia(img) ? (
                                <div className="h-full w-full bg-muted flex flex-col items-center justify-center">
                                  {(() => {
                                    const fileName = img.image_url.split('/').pop() || '';
                                    const Icon = getFileIcon(fileName, img.media_type);
                                    return <Icon className="h-6 w-6 text-muted-foreground" />;
                                  })()}
                                </div>
                              ) : (
                                <img src={img.image_url} alt="" className="h-full w-full object-cover pointer-events-none" />
                              )}
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
              {/* Header with Status and Channel Tabs */}
              <div className="shrink-0 border-b p-4">
                <div className="flex items-center justify-between mb-2">
                  <PostStatusDropdown 
                    status={activePost.status} 
                    customStatusId={(activePost as any).custom_status_id}
                    onStatusChange={handleStatusChange}
                    isLoading={updateStatus.isPending}
                    channel={activePost.channel}
                    clientId={activePost.client_id}
                  />
                  <span
                    className="text-xs text-muted-foreground truncate max-w-[200px] pr-8"
                    title={activePost.clients?.name}
                  >
                    {activePost.clients?.name}
                  </span>
                </div>
                
                {/* Channel Tabs - always show one tab per channel */}
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">Canais</p>
                  <div className="flex flex-wrap gap-1">
                    {group.posts.map((post) => (
                      <button
                        key={post.id}
                        onClick={() => {
                          setActiveChannel(post.channel);
                          setCurrentImageIndex(0);
                          setActiveCommentId(null);
                        }}
                        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
                          post.channel === activeChannel
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        <ChannelBadges channels={[post.channel]} iconOnly />
                        <span className="hidden sm:inline">{getChannelLabel(post.channel)}</span>
                      </button>
                    ))}
                  </div>
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
                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {/* Title (individual per channel) */}
                    <div className="mb-4">
                      <h4 className="mb-1 text-xs font-medium text-muted-foreground">Título</h4>
                      <InlineEditable
                        type="text"
                        value={activePost.title || ''}
                        placeholder="Sem título"
                        onSave={(value) => isMultiChannel ? handleSharedFieldUpdate('title', value) : handleFieldUpdate('title', value)}
                        isLoading={savingField === 'title'}
                      />
                    </div>

                    {/* Caption (individual per channel) - hide for WordPress - PROMOTED TO TOP */}
                    {!isWordPress && (
                      <div className="mb-4">
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-xs font-medium text-muted-foreground">
                            Legenda
                            {isMultiChannel && <span className="ml-1 text-muted-foreground/60">(apenas {getChannelLabel(activePost.channel)})</span>}
                          </h4>
                          {activePost.caption && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCaptionDraft(activePost.caption || '');
                                setCaptionDialogOpen(true);
                              }}
                              className="h-6 px-2 text-xs"
                            >
                              <Maximize2 className="mr-1 h-3 w-3" />
                              Expandir
                            </Button>
                          )}
                        </div>
                        <div className="[&_.ProseMirror]:min-h-[280px] [&_.prose]:min-h-[260px]">
                          <InlineRichTextEditor
                            key={activePost.id}
                            value={activePost.caption || ''}
                            onSave={(value) => handleFieldUpdate('caption', value)}
                            isLoading={savingField === 'caption'}
                            placeholder="Clique para adicionar legenda..."
                          />
                        </div>
                      </div>
                    )}

                    <Separator className="my-4" />

                    {/* Metadata grid: Client | Date, Channel | Status */}
                    <div className="mb-3 grid grid-cols-2 gap-3">
                      {/* Client (shared) */}
                      <div>
                        <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                          Cliente
                          {isMultiChannel && <span className="ml-1 text-primary">(todos)</span>}
                        </h4>
                        <InlineEditable
                          type="select"
                          value={activePost.client_id}
                          displayValue={activePost.clients?.name || 'Selecione'}
                          options={clientOptions}
                          onSave={(value) => isMultiChannel ? handleSharedFieldUpdate('client_id', value) : handleFieldUpdate('client_id', value)}
                          isLoading={savingField === 'client_id'}
                        />
                      </div>

                      {/* Schedule Info (shared) */}
                      <div>
                        <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                          Data e Hora
                          {isMultiChannel && <span className="ml-1 text-primary">(todos)</span>}
                        </h4>
                        <InlineEditable
                          type="datetime"
                          value={formatDateTimeForInput(scheduledDate)}
                          displayValue={`${scheduledDate.toLocaleDateString('pt-BR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })} às ${scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                          onSave={(value) => isMultiChannel ? handleSharedFieldUpdate('scheduled_at', value) : handleFieldUpdate('scheduled_at', value)}
                          isLoading={savingField === 'scheduled_at'}
                        />
                      </div>

                      {/* Channel (individual - only show if single channel) */}
                      {!isMultiChannel && (
                        <div>
                          <h4 className="mb-1 text-xs font-medium text-muted-foreground">Canal</h4>
                          <InlineEditable
                            type="select"
                            value={activePost.channel}
                            displayValue={getChannelLabel(activePost.channel)}
                            options={CHANNEL_OPTIONS}
                            onSave={(value) => handleFieldUpdate('channel', value)}
                            isLoading={savingField === 'channel'}
                          />
                        </div>
                      )}

                      {/* Status (individual per channel) */}
                      <div>
                        <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                          Status
                          {isMultiChannel && <span className="ml-1 text-muted-foreground/60">(apenas {getChannelLabel(activePost.channel)})</span>}
                        </h4>
                        <Select value={activePost.status} onValueChange={(v) => handleStatusChange(v as PostStatus)}>
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

                    {/* WordPress-specific fields */}
                    {isWordPress && (
                      <>
                        <Separator className="my-4" />
                        <div className="mb-4 flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">WordPress</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => triggerWebhook.mutate(activePost.id)}
                            disabled={triggerWebhook.isPending}
                            className="h-7 text-xs"
                          >
                            {triggerWebhook.isPending ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Wand2 className="mr-1 h-3 w-3" />
                            )}
                            Gerar Conteúdo
                          </Button>
                        </div>

                        <div className="mb-4">
                          <h4 className="mb-1 text-xs font-medium text-muted-foreground">Título do Artigo</h4>
                          <InlineEditable
                            type="text"
                            value={(activePost as any).article_title || ''}
                            displayValue={(activePost as any).article_title || 'Clique para adicionar...'}
                            onSave={(value) => handleFieldUpdate('article_title', value)}
                            isLoading={savingField === 'article_title'}
                          />
                        </div>

                        <div className="mb-4">
                          <h4 className="mb-1 text-xs font-medium text-muted-foreground">Palavra-chave SEO</h4>
                          <InlineEditable
                            type="text"
                            value={(activePost as any).seo_keyword || ''}
                            displayValue={(activePost as any).seo_keyword || 'Clique para adicionar...'}
                            onSave={(value) => handleFieldUpdate('seo_keyword', value)}
                            isLoading={savingField === 'seo_keyword'}
                          />
                        </div>

                        <div className="mb-4">
                          <h4 className="mb-1 text-xs font-medium text-muted-foreground">Tipo de Projeto</h4>
                          <Select 
                            value={(activePost as any).project_type || ''} 
                            onValueChange={(v) => handleFieldUpdate('project_type', v)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione o tipo de projeto" />
                            </SelectTrigger>
                            <SelectContent>
                              {PROJECT_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="mb-4">
                          <div className="mb-2 flex items-center justify-between">
                            <h4 className="text-xs font-medium text-muted-foreground">Texto do Artigo</h4>
                          </div>
                          <RichTextEditor
                            key={activePost.id}
                            value={(activePost as any).article_content || ''}
                            onChange={(value) => handleFieldUpdate('article_content', value)}
                            placeholder="Escreva o artigo completo..."
                            maxLength={50000}
                            maxHeight="300px"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="shrink-0 border-t bg-background p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <div className="mb-3 text-xs text-muted-foreground">
                      <p>Criado: {new Date(activePost.created_at).toLocaleString('pt-BR')}</p>
                      <p>Atualizado: {new Date(activePost.updated_at).toLocaleString('pt-BR')}</p>
                    </div>

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
                                activePost.clients?.name || 'post',
                                scheduledDate,
                                activePost.channel
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
                            <AlertDialogTitle>
                              {isMultiChannel ? 'Excluir Canal ou Todos?' : 'Excluir Post?'}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {isMultiChannel 
                                ? `Deseja excluir apenas o canal ${getChannelLabel(activePost.channel)} ou todos os ${group.posts.length} canais deste post?`
                                : 'Esta ação não pode ser desfeita. O post e todas as imagens serão excluídos permanentemente.'
                              }
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            {isMultiChannel && (
                              <AlertDialogAction onClick={handleDelete} className="bg-amber-600 text-white hover:bg-amber-700">
                                Excluir Canal
                              </AlertDialogAction>
                            )}
                            <AlertDialogAction 
                              onClick={isMultiChannel ? handleDeleteAll : handleDelete} 
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {isMultiChannel ? 'Excluir Todos' : 'Excluir'}
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
                    postId={activePost.id}
                    images={images}
                    activeCommentId={activeCommentId}
                    onCommentClick={handleCommentClick}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <FullscreenViewer
            post={activePost}
            open={fullscreenOpen}
            onOpenChange={setFullscreenOpen}
          />
        </DialogContent>
      </Dialog>

      {/* Caption Expanded Dialog */}
      <Dialog open={captionDialogOpen} onOpenChange={setCaptionDialogOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col">
          <DialogHeader>
            <DialogTitle>
              Legenda - {getChannelLabel(activePost.channel)}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1">
            <RichTextEditor
              value={captionDraft}
              onChange={setCaptionDraft}
              placeholder="Digite a legenda..."
              maxLength={20000}
              className="h-full"
              maxHeight="calc(85vh - 220px)"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCaptionDialogOpen(false)}
              disabled={captionSaving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={async () => {
                setCaptionSaving(true);
                try {
                  await handleFieldUpdate('caption', captionDraft);
                  setCaptionDialogOpen(false);
                } finally {
                  setCaptionSaving(false);
                }
              }}
              disabled={captionSaving || captionDraft === (activePost.caption || '')}
            >
              {captionSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
