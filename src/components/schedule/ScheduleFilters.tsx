import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, X } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import type { Database } from '@/integrations/supabase/types';

type PostStatus = Database['public']['Enums']['post_status'];
type SocialChannel = Database['public']['Enums']['social_channel'];

interface ScheduleFiltersProps {
  clientId: string | undefined;
  status: PostStatus[];
  channel: SocialChannel[];
  onClientChange: (clientId: string | undefined) => void;
  onStatusChange: (status: PostStatus[]) => void;
  onChannelChange: (channel: SocialChannel[]) => void;
  onClear: () => void;
}

const statusOptions: { value: PostStatus; label: string }[] = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'ai_generated', label: 'Gerado por IA' },
  { value: 'reviewed', label: 'Revisado' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'scheduled', label: 'Agendado' },
  { value: 'published', label: 'Publicado' },
];

const channelOptions: { value: SocialChannel; label: string }[] = [
  { value: 'instagram_feed', label: 'Instagram Feed' },
  { value: 'instagram_reels', label: 'Instagram Reels' },
  { value: 'instagram_story', label: 'Instagram Story' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'wordpress', label: 'WordPress' },
];

export function ScheduleFilters({
  clientId,
  status,
  channel,
  onClientChange,
  onStatusChange,
  onChannelChange,
  onClear,
}: ScheduleFiltersProps) {
  const { data: clients = [] } = useClients();
  const hasFilters = clientId || status.length > 0 || channel.length > 0;

  const toggleStatus = (value: PostStatus) => {
    if (status.includes(value)) {
      onStatusChange(status.filter((s) => s !== value));
    } else {
      onStatusChange([...status, value]);
    }
  };

  const toggleChannel = (value: SocialChannel) => {
    if (channel.includes(value)) {
      onChannelChange(channel.filter((c) => c !== value));
    } else {
      onChannelChange([...channel, value]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Cliente Filter */}
      <Select value={clientId || 'all'} onValueChange={(v) => onClientChange(v === 'all' ? undefined : v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Todos os clientes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os clientes</SelectItem>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-10">
            <Filter className="mr-2 h-4 w-4" />
            Status
            {status.length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                {status.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48" align="start">
          <div className="space-y-2">
            {statusOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${option.value}`}
                  checked={status.includes(option.value)}
                  onCheckedChange={() => toggleStatus(option.value)}
                />
                <Label htmlFor={`status-${option.value}`} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Channel Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-10">
            <Filter className="mr-2 h-4 w-4" />
            Canal
            {channel.length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                {channel.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48" align="start">
          <div className="space-y-2">
            {channelOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`channel-${option.value}`}
                  checked={channel.includes(option.value)}
                  onCheckedChange={() => toggleChannel(option.value)}
                />
                <Label htmlFor={`channel-${option.value}`} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-10">
          <X className="mr-1 h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}
