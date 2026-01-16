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
import { Loader2 } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { postSchema, PostFormData, PostWithImages, useCreatePost, useUpdatePost } from '@/hooks/usePosts';
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
};

export function PostForm({ open, onOpenChange, post, defaultDate }: PostFormProps) {
  const { data: clients = [] } = useClients();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<{ id: string; image_url: string }[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);

  const isEditing = !!post;
  const isLoading = createPost.isPending || updatePost.isPending;

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      client_id: '',
      channel: 'instagram_feed',
      scheduled_at: '',
      caption: '',
      status: 'draft',
    },
  });

  const selectedClientId = form.watch('client_id');
  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const availableChannels = selectedClient?.channels || [];

  useEffect(() => {
    if (post) {
      form.reset({
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
        channel: 'instagram_feed',
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
  }, [post, defaultDate, form]);

  const onSubmit = async (data: PostFormData) => {
    if (isEditing && post) {
      await updatePost.mutateAsync({
        id: post.id,
        post: data,
        newImages: images,
        removedImageIds,
      });
    } else {
      await createPost.mutateAsync({
        post: data,
        images,
      });
    }
    onOpenChange(false);
  };

  const handleExistingImageRemove = (id: string) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
    setRemovedImageIds((prev) => [...prev, id]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Post' : 'Novo Post'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="content">Conteúdo</TabsTrigger>
                <TabsTrigger value="images">Imagens</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4 pt-4">
                {/* Cliente */}
                <FormField
                  control={form.control}
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

                {/* Canal */}
                <FormField
                  control={form.control}
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
                          {(availableChannels.length > 0 ? availableChannels : Object.keys(channelLabels)).map(
                            (ch) => (
                              <SelectItem key={ch} value={ch}>
                                <div className="flex items-center gap-2">
                                  <ChannelBadges channels={[ch as SocialChannel]} size="sm" />
                                  {channelLabels[ch as SocialChannel]}
                                </div>
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Data e Hora */}
                <FormField
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                {isEditing ? 'Salvar' : 'Criar Post'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
