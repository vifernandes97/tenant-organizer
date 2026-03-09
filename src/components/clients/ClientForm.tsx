import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2, Link as LinkIcon } from "lucide-react";
import { clientSchema, ClientFormData, useCreateClient, useUpdateClient } from "@/hooks/useClients";
import { useClientPostStatuses, useBulkUpsertClientPostStatuses, DEFAULT_POST_STATUSES, type ClientPostStatusInsert } from "@/hooks/useClientPostStatuses";
import { ClientStatusConfig } from "./ClientStatusConfig";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type SocialChannel = Database["public"]["Enums"]["social_channel"];

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
}

const channels: { value: SocialChannel; label: string }[] = [
  { value: "instagram_feed", label: "Instagram Feed" },
  { value: "instagram_reels", label: "Instagram Reels" },
  { value: "instagram_story", label: "Instagram Story" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "Twitter" },
  { value: "youtube", label: "YouTube" },
  { value: "wordpress", label: "WordPress" },
];

export function ClientForm({ open, onOpenChange, client }: ClientFormProps) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const isEditing = !!client;

  const [tagInput, setTagInput] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [customStatuses, setCustomStatuses] = useState<Omit<ClientPostStatusInsert, 'client_id' | 'tenant_id'>[]>([]);

  const { data: existingStatuses = [] } = useClientPostStatuses(client?.id);
  const bulkUpsertStatuses = useBulkUpsertClientPostStatuses();

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      description: "",
      segment: "",
      status: "active",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      persona: "",
      tone_of_voice: "",
      channels: [],
      tags: [],
      important_links: [],
      notes: "",
    },
  });

  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        description: client.description || "",
        segment: client.segment || "",
        status: client.status,
        contact_name: client.contact_name || "",
        contact_email: client.contact_email || "",
        contact_phone: client.contact_phone || "",
        persona: client.persona || "",
        tone_of_voice: client.tone_of_voice || "",
        channels: (client.channels as SocialChannel[]) || [],
        tags: (client.tags as string[]) || [],
        important_links: (client.important_links as { label: string; url: string }[]) || [],
        notes: client.notes || "",
      });
      // Load existing custom statuses
      setCustomStatuses(existingStatuses.map(s => ({
        name: s.name,
        slug: s.slug,
        color: s.color,
        icon: s.icon,
        display_order: s.display_order,
        is_final: s.is_final,
      })));
    } else {
      form.reset({
        name: "",
        description: "",
        segment: "",
        status: "active",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        persona: "",
        tone_of_voice: "",
        channels: [],
        tags: [],
        important_links: [],
        notes: "",
      });
    }
  }, [client, form, existingStatuses]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      if (isEditing && client) {
        await updateClient.mutateAsync({ id: client.id, data });
        // Save custom statuses
        await bulkUpsertStatuses.mutateAsync({ clientId: client.id, statuses: customStatuses });
      } else {
        const newClient = await createClient.mutateAsync(data);
        // Save custom statuses for new client
        if (customStatuses.length > 0) {
          await bulkUpsertStatuses.mutateAsync({ clientId: newClient.id, statuses: customStatuses });
        }
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const addTag = () => {
    if (tagInput.trim()) {
      const currentTags = form.getValues("tags");
      if (!currentTags.includes(tagInput.trim())) {
        form.setValue("tags", [...currentTags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    const currentTags = form.getValues("tags");
    form.setValue("tags", currentTags.filter((t) => t !== tag));
  };

  const addLink = () => {
    if (linkLabel.trim() && linkUrl.trim()) {
      try {
        new URL(linkUrl);
        const currentLinks = form.getValues("important_links");
        form.setValue("important_links", [...currentLinks, { label: linkLabel.trim(), url: linkUrl.trim() }]);
        setLinkLabel("");
        setLinkUrl("");
      } catch {
        // Invalid URL
      }
    }
  };

  const removeLink = (index: number) => {
    const currentLinks = form.getValues("important_links");
    form.setValue("important_links", currentLinks.filter((_, i) => i !== index));
  };

  const isPending = createClient.isPending || updateClient.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Dados</TabsTrigger>
                <TabsTrigger value="contact">Contato</TabsTrigger>
                <TabsTrigger value="marketing">Marketing</TabsTrigger>
                <TabsTrigger value="links">Links</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da empresa *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Empresa ABC" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Breve descrição do cliente..."
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="segment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Segmento</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Tecnologia"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                            <SelectItem value="active">Ativo</SelectItem>
                            <SelectItem value="paused">Pausado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do contato</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: João Silva"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contato@empresa.com"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(11) 99999-9999"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="marketing" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="persona"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Persona</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva o público-alvo..."
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tone_of_voice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tom de voz</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ex: Profissional mas acessível..."
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="channels"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canais</FormLabel>
                      <div className="grid grid-cols-3 gap-2">
                        {channels.map((channel) => (
                          <div key={channel.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={channel.value}
                              checked={field.value.includes(channel.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, channel.value]);
                                } else {
                                  field.onChange(field.value.filter((v) => v !== channel.value));
                                }
                              }}
                            />
                            <label
                              htmlFor={channel.value}
                              className="text-sm cursor-pointer"
                            >
                              {channel.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Adicionar tag..."
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addTag();
                            }
                          }}
                        />
                        <Button type="button" variant="outline" size="icon" onClick={addTag}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {field.value.map((tag) => (
                            <Badge key={tag} variant="secondary" className="gap-1">
                              {tag}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => removeTag(tag)}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="links" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="important_links"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Links importantes</FormLabel>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nome do link"
                          value={linkLabel}
                          onChange={(e) => setLinkLabel(e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="https://..."
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          className="flex-1"
                        />
                        <Button type="button" variant="outline" size="icon" onClick={addLink}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {field.value.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {field.value.map((link, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-2 bg-muted rounded-md"
                            >
                              <LinkIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{link.label}</span>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline truncate flex-1"
                              >
                                {link.url}
                              </a>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => removeLink(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas gerais</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Anotações sobre o cliente..."
                          className="min-h-[120px]"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salvar" : "Criar cliente"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
