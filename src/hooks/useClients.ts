import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];
type SocialChannel = Database["public"]["Enums"]["social_channel"];
type ClientStatus = Database["public"]["Enums"]["client_status"];

export const clientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  description: z.string().max(500, "Descrição muito longa").optional().nullable(),
  segment: z.string().max(100, "Segmento muito longo").optional().nullable(),
  status: z.enum(["active", "paused"] as const).default("active"),
  contact_name: z.string().max(100, "Nome muito longo").optional().nullable(),
  contact_email: z.string().email("Email inválido").or(z.literal("")).optional().nullable(),
  contact_phone: z.string().max(20, "Telefone muito longo").optional().nullable(),
  persona: z.string().max(1000, "Persona muito longa").optional().nullable(),
  tone_of_voice: z.string().max(500, "Tom de voz muito longo").optional().nullable(),
  channels: z.array(z.enum(["instagram_feed", "instagram_reels", "instagram_story", "tiktok", "linkedin", "facebook", "twitter", "youtube", "wordpress"] as const)).default([]),
  tags: z.array(z.string()).default([]),
  important_links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
  notes: z.string().max(2000, "Notas muito longas").optional().nullable(),
});

export type ClientFormData = z.infer<typeof clientSchema>;

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useClient(id: string | null) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Client;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: ClientFormData) => {
      if (!profile?.tenant_id) {
        throw new Error("Tenant não encontrado");
      }

      const insertData: ClientInsert = {
        name: data.name,
        tenant_id: profile.tenant_id,
        description: data.description,
        segment: data.segment,
        status: data.status as ClientStatus,
        contact_name: data.contact_name,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone,
        persona: data.persona,
        tone_of_voice: data.tone_of_voice,
        channels: data.channels as SocialChannel[],
        tags: data.tags,
        important_links: data.important_links as unknown as Database["public"]["Tables"]["clients"]["Insert"]["important_links"],
        notes: data.notes,
      };

      const { data: client, error } = await supabase
        .from("clients")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating client:", error);
      toast.error("Erro ao criar cliente");
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ClientFormData }) => {
      const updateData: ClientUpdate = {
        ...data,
        contact_email: data.contact_email || null,
        channels: data.channels as SocialChannel[],
        status: data.status as ClientStatus,
        important_links: data.important_links as unknown as Database["public"]["Tables"]["clients"]["Update"]["important_links"],
      };

      const { data: client, error } = await supabase
        .from("clients")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating client:", error);
      toast.error("Erro ao atualizar cliente");
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting client:", error);
      toast.error("Erro ao excluir cliente");
    },
  });
}
