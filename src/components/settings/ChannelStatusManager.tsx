import { useEffect, useMemo, useState } from 'react';
import { useClients } from '@/hooks/useClients';
import {
  useClientPostStatuses,
  useBulkUpsertClientPostStatuses,
  type ClientPostStatusInsert,
  getDefaultStatusesForChannel,
} from '@/hooks/useClientPostStatuses';
import { supabase } from '@/integrations/supabase/client';
import { ClientStatusConfig } from '@/components/clients/ClientStatusConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Instagram,
  Linkedin,
  Facebook,
  Twitter,
  Youtube,
  Globe,
  Loader2,
  Copy,
  Sparkles,
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

type SocialChannel = Database['public']['Enums']['social_channel'];
type StatusItem = Omit<ClientPostStatusInsert, 'client_id' | 'tenant_id' | 'channel'>;

const CHANNEL_META: Record<SocialChannel, { label: string; icon: React.ElementType; colorClass: string }> = {
  instagram_feed: { label: 'Instagram Feed', icon: Instagram, colorClass: 'text-pink-600' },
  instagram_reels: { label: 'Instagram Reels', icon: Instagram, colorClass: 'text-pink-600' },
  instagram_story: { label: 'Instagram Stories', icon: Instagram, colorClass: 'text-pink-600' },
  tiktok: { label: 'TikTok', icon: Sparkles, colorClass: 'text-cyan-600' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, colorClass: 'text-blue-600' },
  facebook: { label: 'Facebook', icon: Facebook, colorClass: 'text-blue-700' },
  twitter: { label: 'Twitter', icon: Twitter, colorClass: 'text-sky-600' },
  youtube: { label: 'YouTube', icon: Youtube, colorClass: 'text-red-600' },
  wordpress: { label: 'WordPress', icon: Globe, colorClass: 'text-slate-600' },
};

/** Hook: count how many custom statuses exist per channel for a given client. */
function useChannelStatusCounts(clientId: string | null) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['client-post-statuses-counts', clientId],
    queryFn: async () => {
      if (!clientId) return {} as Record<SocialChannel, number>;
      const { data, error } = await supabase
        .from('client_post_statuses')
        .select('channel')
        .eq('client_id', clientId);
      if (error) throw error;
      const counts: Partial<Record<SocialChannel, number>> = {};
      (data || []).forEach((row: { channel: SocialChannel }) => {
        counts[row.channel] = (counts[row.channel] || 0) + 1;
      });
      return counts as Record<SocialChannel, number>;
    },
    enabled: !!clientId && !!profile?.tenant_id,
  });
}

export function ChannelStatusManager() {
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const activeClients = useMemo(() => clients.filter((c) => c.status === 'active'), [clients]);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<SocialChannel | null>(null);

  // Auto-select first client
  useEffect(() => {
    if (!selectedClientId && activeClients.length > 0) {
      setSelectedClientId(activeClients[0].id);
    }
  }, [activeClients, selectedClientId]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  const clientChannels = useMemo<SocialChannel[]>(
    () => (selectedClient?.channels || []) as SocialChannel[],
    [selectedClient]
  );

  // Auto-select first channel of selected client
  useEffect(() => {
    if (clientChannels.length === 0) {
      setSelectedChannel(null);
    } else if (!selectedChannel || !clientChannels.includes(selectedChannel)) {
      setSelectedChannel(clientChannels[0]);
    }
  }, [clientChannels, selectedChannel]);

  const { data: counts = {} as Record<SocialChannel, number> } = useChannelStatusCounts(selectedClientId);

  const { data: existingStatuses = [], isLoading: loadingStatuses } = useClientPostStatuses(
    selectedClientId,
    selectedChannel ?? undefined
  );

  const bulkUpsert = useBulkUpsertClientPostStatuses();

  const [draft, setDraft] = useState<StatusItem[]>([]);
  const [dirty, setDirty] = useState(false);

  // Sync draft with fetched statuses when (client, channel) changes
  useEffect(() => {
    setDraft(
      existingStatuses.map((s) => ({
        name: s.name,
        slug: s.slug,
        color: s.color,
        icon: s.icon,
        display_order: s.display_order,
        is_final: s.is_final,
      }))
    );
    setDirty(false);
  }, [existingStatuses, selectedClientId, selectedChannel]);

  const handleChange = (next: StatusItem[]) => {
    setDraft(next);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!selectedClientId || !selectedChannel) return;
    await bulkUpsert.mutateAsync({
      clientId: selectedClientId,
      channel: selectedChannel,
      statuses: draft,
    });
    setDirty(false);
  };

  const handleLoadDefault = () => {
    if (!selectedChannel) return;
    handleChange([...getDefaultStatusesForChannel(selectedChannel)]);
  };

  const handleCopyFromChannel = async (sourceChannel: SocialChannel) => {
    if (!selectedClientId) return;
    const { data, error } = await supabase
      .from('client_post_statuses')
      .select('*')
      .eq('client_id', selectedClientId)
      .eq('channel', sourceChannel)
      .order('display_order', { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    handleChange(
      (data || []).map((s) => ({
        name: s.name,
        slug: s.slug,
        color: s.color,
        icon: s.icon,
        display_order: s.display_order,
        is_final: s.is_final,
      }))
    );
  };

  if (loadingClients) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (activeClients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status de Posts</CardTitle>
          <CardDescription>
            Configure os status de posts por cliente e canal social.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum cliente ativo. Crie um cliente em <strong>Clientes</strong> antes de configurar status.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Status de Posts por Canal</CardTitle>
            <CardDescription>
              Defina conjuntos de status diferentes para cada canal social do cliente.
            </CardDescription>
          </div>
          <div className="w-full sm:w-72">
            <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {activeClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {clientChannels.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Este cliente ainda não tem canais ativos. Edite o cliente em{' '}
            <strong>Clientes → Canais</strong> para habilitar canais sociais.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
            {/* Sidebar: channels list */}
            <div className="space-y-1">
              <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Canais
              </p>
              {clientChannels.map((ch) => {
                const meta = CHANNEL_META[ch];
                const Icon = meta.icon;
                const count = counts[ch] || 0;
                const isActive = selectedChannel === ch;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setSelectedChannel(ch)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                      isActive
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-transparent hover:bg-muted/60 text-muted-foreground'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', meta.colorClass)} />
                    <span className="flex-1 font-medium text-foreground">{meta.label}</span>
                    <Badge variant={count > 0 ? 'secondary' : 'outline'} className="text-[10px]">
                      {count > 0 ? count : 'padrão'}
                    </Badge>
                  </button>
                );
              })}
            </div>

            {/* Editor */}
            <div className="space-y-4 rounded-lg border p-4">
              {!selectedChannel ? (
                <p className="text-sm text-muted-foreground">Selecione um canal para configurar.</p>
              ) : loadingStatuses ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const Icon = CHANNEL_META[selectedChannel].icon;
                        return <Icon className={cn('h-4 w-4', CHANNEL_META[selectedChannel].colorClass)} />;
                      })()}
                      <h3 className="text-sm font-semibold">
                        {CHANNEL_META[selectedChannel].label}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={handleLoadDefault}>
                        Carregar padrão
                      </Button>
                      {clientChannels.filter((c) => c !== selectedChannel).length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="outline" size="sm" className="gap-1">
                              <Copy className="h-3.5 w-3.5" />
                              Copiar de canal
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-50 bg-popover">
                            {clientChannels
                              .filter((c) => c !== selectedChannel)
                              .map((c) => {
                                const meta = CHANNEL_META[c];
                                const Icon = meta.icon;
                                const cnt = counts[c] || 0;
                                return (
                                  <DropdownMenuItem
                                    key={c}
                                    disabled={cnt === 0}
                                    onClick={() => handleCopyFromChannel(c)}
                                    className="cursor-pointer"
                                  >
                                    <Icon className={cn('mr-2 h-4 w-4', meta.colorClass)} />
                                    <span className="flex-1">{meta.label}</span>
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      {cnt > 0 ? `${cnt} status` : 'vazio'}
                                    </span>
                                  </DropdownMenuItem>
                                );
                              })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  <ClientStatusConfig statuses={draft} onChange={handleChange} />

                  <div className="flex items-center justify-between border-t pt-3">
                    <p className="text-xs text-muted-foreground">
                      {draft.length === 0
                        ? 'Sem configuração — os status padrão do sistema serão usados.'
                        : `${draft.length} status configurados.`}
                    </p>
                    <Button
                      type="button"
                      onClick={handleSave}
                      disabled={!dirty || bulkUpsert.isPending}
                    >
                      {bulkUpsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar alterações
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
