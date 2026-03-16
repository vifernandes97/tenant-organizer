import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import type { Database } from '@/integrations/supabase/types';

type SocialChannel = Database['public']['Enums']['social_channel'];

const CHANNEL_LABELS: Record<SocialChannel, string> = {
  instagram_feed: 'Instagram Feed',
  instagram_story: 'Instagram Story',
  instagram_reels: 'Instagram Reels',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  twitter: 'Twitter / X',
  youtube: 'YouTube',
  wordpress: 'WordPress',
};

interface SendToBacklogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (clientId: string, channels: SocialChannel[]) => Promise<void>;
  ideaTitle: string;
  isSaving: boolean;
}

export function SendToBacklogDialog({
  open,
  onOpenChange,
  onConfirm,
  ideaTitle,
  isSaving,
}: SendToBacklogDialogProps) {
  const { data: clients = [] } = useClients();
  const [clientId, setClientId] = useState('');
  const [channels, setChannels] = useState<SocialChannel[]>([]);

  const selectedClient = clients.find((c) => c.id === clientId);
  const availableChannels = (selectedClient?.channels as SocialChannel[]) || [];

  const toggleChannel = (ch: SocialChannel) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const handleConfirm = async () => {
    if (!clientId || channels.length === 0) return;
    await onConfirm(clientId, channels);
    setClientId('');
    setChannels([]);
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setClientId('');
      setChannels([]);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar para backlog</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground truncate">
          Ideia: <span className="font-medium text-foreground">{ideaTitle}</span>
        </p>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select
              value={clientId}
              onValueChange={(v) => {
                setClientId(v);
                setChannels([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients
                  .filter((c) => c.status === 'active')
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {clientId && (
            <div className="space-y-2">
              <Label>Canais *</Label>
              {availableChannels.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Este cliente não possui canais configurados.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availableChannels.map((ch) => (
                    <label
                      key={ch}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={channels.includes(ch)}
                        onCheckedChange={() => toggleChannel(ch)}
                      />
                      {CHANNEL_LABELS[ch] || ch}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!clientId || channels.length === 0 || isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
