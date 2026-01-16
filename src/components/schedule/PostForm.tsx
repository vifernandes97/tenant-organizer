import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronDown, X } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { 
  postSchema, 
  postEditSchema, 
  PostFormData, 
  PostEditFormData, 
  PostWithImages, 
  useCreatePost, 
  useUpdatePost 
} from '@/hooks/usePosts';
import { ImageUploader } from './ImageUploader';
import { ChannelBadges } from '@/components/clients/ChannelBadges';
import type { Database } from '@/integrations/supabase/types';

type SocialChannel = Database['public']['Enums']['social_channel'];

interface PostFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: PostWithImages | null;
  defaultDate?: Date;
}

const channelLabels: Record<SocialChannel, string> = {
  instagram_feed: 'Instagram Feed',
  instagram_reels: 'Instagram Reels',
  instagram_story: 'Instagram Story',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  facebook: 'Facebook',
  twitter: 'Twitter',
  wordpress: 'WordPress',
};

const allChannels: SocialChannel[] = [
  'instagram_feed',
  'instagram_reels',
  'instagram_story',
  'tiktok',
  'linkedin',
  'youtube',
  'facebook',
  'twitter',
  'wordpress',
];

export function PostForm({ open, onOpenChange, post, defaultDate }: PostFormProps) {
  const { data: clients = [] } = useClients();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<{ id: string; image_url: string }[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [channelPopoverOpen, setChannelPopoverOpen] = useState(false);

  const isEditing = !!post;
  const isLoading = createPost.isPending || updatePost.isPending;

  // Use different schemas for create vs edit
  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      client_id: '',
      channels: [],
      scheduled_at: '',
      caption: '',
      status: 'draft',
    },
  });

  const editForm = useForm<PostEditFormData>({
    resolver: zodResolver(postEditSchema),
    defaultValues: {
      client_id: '',
      channel: 'instagram_feed',
      scheduled_at: '',
      caption: '',
      status: 'draft',
    },
  });

  // Watch client_id from the appropriate form
  const createClientId = form.watch('client_id');
  const editClientId = editForm.watch('client_id');
  const selectedClientId = isEditing ? editClientId : createClientId;
  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const availableChannels: SocialChannel[] = (selectedClient?.channels as SocialChannel[]) || allChannels;

  // For create mode - watch the form directly
  const selectedChannels = form.watch('channels') || [];
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeForm = (isEditing ? editForm : form) as any;

  useEffect(() => {
    if (post) {
      editForm.reset({
        client_id: post.client_id,
        channel: post.channel,
        scheduled_at: new Date(post.scheduled_at).toISOString().slice(0, 16),
        caption: post.caption || '',
        status: post.status,
      });
      setExistingImages(
        post.post_images?.map((img) => ({ id: img.id, image_url: img.image_url })) || []
      );
    } else {
      form.reset({
        client_id: '',
        channels: [],
        scheduled_at: defaultDate
          ? new Date(defaultDate).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        caption: '',
        status: 'draft',
      });
      setExistingImages([]);
    }
    setImages([]);
    setRemovedImageIds([]);
  }, [post, defaultDate, form, editForm]);

  const onSubmit = async (data: PostFormData | PostEditFormData) => {
    if (isEditing && post) {
      await updatePost.mutateAsync({
        id: post.id,
        post: data as PostEditFormData,
        newImages: images,
        removedImageIds,
      });
    } else {
      await createPost.mutateAsync({
        post: data as PostFormData,
        images,
      });
    }
    onOpenChange(false);
  };

  const handleExistingImageRemove = (id: string) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
    setRemovedImageIds((prev) => [...prev, id]);
  };

  const toggleChannel = (channel: SocialChannel) => {
    const current = form.getValues('channels') || [];
    if (current.includes(channel)) {
      form.setValue('channels', current.filter((c) => c !== channel), { shouldValidate: true });
    } else {
      form.setValue('channels', [...current, channel], { shouldValidate: true });
    }
  };

  const removeChannel = (channel: SocialChannel) => {
    const current = form.getValues('channels') || [];
    form.setValue('channels', current.filter((c) => c !== channel), { shouldValidate: true });
  };

  const postCount = selectedChannels.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Post' : 'Novo Post'}</DialogTitle>
        </DialogHeader>

        <Form {...activeForm}>
          <form onSubmit={activeForm.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="content">Conteúdo</TabsTrigger>
                <TabsTrigger value="images">Imagens</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4 pt-4">
                {/* Cliente */}
                <FormField
                  control={activeForm.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Canal - Multi-select for create, single select for edit */}
                {isEditing ? (
                  <FormField
                    control={editForm.control}
                    name="channel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Canal *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!selectedClientId}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um canal" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableChannels.map((ch) => (
                              <SelectItem key={ch} value={ch}>
                                <div className="flex items-center gap-2">
                                  <ChannelBadges channels={[ch]} size="sm" />
                                  {channelLabels[ch]}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="channels"
                    render={() => (
                      <FormItem>
                        <FormLabel>Canais *</FormLabel>
                        <Popover open={channelPopoverOpen} onOpenChange={setChannelPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={channelPopoverOpen}
                              className="w-full justify-between h-auto min-h-10"
                              disabled={!selectedClientId}
                            >
                              {selectedChannels.length === 0 ? (
                                <span className="text-muted-foreground">Selecione os canais</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {selectedChannels.slice(0, 3).map((channel) => (
                                    <Badge
                                      key={channel}
                                      variant="secondary"
                                      className="flex items-center gap-1"
                                    >
                                      <ChannelBadges channels={[channel]} size="sm" />
                                      {channelLabels[channel].split(' ')[0]}
                                      <X
                                        className="h-3 w-3 cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeChannel(channel);
                                        }}
                                      />
                                    </Badge>
                                  ))}
                                  {selectedChannels.length > 3 && (
                                    <Badge variant="secondary">
                                      +{selectedChannels.length - 3} mais
                                    </Badge>
                                  )}
                                </div>
                              )}
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-2" align="start">
                            <div className="space-y-2">
                              {availableChannels.map((channel) => (
                                <div
                                  key={channel}
                                  className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                                  onClick={() => toggleChannel(channel)}
                                >
                                  <Checkbox
                                    checked={selectedChannels.includes(channel)}
                                    onCheckedChange={() => toggleChannel(channel)}
                                  />
                                  <ChannelBadges channels={[channel]} size="sm" />
                                  <span className="text-sm">{channelLabels[channel]}</span>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Data e Hora */}
                <FormField
                  control={activeForm.control}
                  name="scheduled_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data e Hora *</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={activeForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Rascunho</SelectItem>
                          <SelectItem value="approved">Aprovado</SelectItem>
                          <SelectItem value="scheduled">Agendado</SelectItem>
                          <SelectItem value="published">Publicado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Legenda */}
                <FormField
                  control={activeForm.control}
                  name="caption"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Legenda
                        <span className="ml-2 text-xs text-muted-foreground">
                          {field.value?.length || 0}/2200
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Escreva a legenda do post..."
                          className="min-h-[120px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="images" className="pt-4">
                <Label>Imagens do Post</Label>
                <div className="mt-2">
                  <ImageUploader
                    images={images}
                    existingImages={existingImages}
                    onImagesChange={setImages}
                    onExistingImageRemove={handleExistingImageRemove}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing 
                  ? 'Salvar' 
                  : postCount > 1 
                    ? `Criar ${postCount} Posts` 
                    : 'Criar Post'
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}