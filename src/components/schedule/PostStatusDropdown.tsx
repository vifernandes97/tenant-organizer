import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { FileText, Check, Clock, CheckCircle, ChevronDown, Loader2, Sparkles, Eye, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientPostStatuses, type ClientPostStatus } from '@/hooks/useClientPostStatuses';
import type { Database } from '@/integrations/supabase/types';

type PostStatus = Database['public']['Enums']['post_status'];
type SocialChannel = Database['public']['Enums']['social_channel'];

interface PostStatusDropdownProps {
  status: PostStatus;
  customStatusId?: string | null;
  onStatusChange: (status: PostStatus, customStatusId?: string) => void;
  isLoading?: boolean;
  channel?: SocialChannel;
  clientId?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  'file-text': FileText,
  'check': Check,
  'clock': Clock,
  'check-circle': CheckCircle,
  'sparkles': Sparkles,
  'eye': Eye,
  'circle': Circle,
};

const statusConfig: Record<PostStatus, { 
  label: string; 
  variant: 'secondary' | 'outline' | 'default'; 
  className: string; 
  icon: React.ElementType 
}> = {
  draft: {
    label: 'Rascunho',
    variant: 'secondary',
    className: 'bg-muted text-muted-foreground',
    icon: FileText,
  },
  ai_generated: {
    label: 'Gerado por IA',
    variant: 'outline',
    className: 'border-violet-500 text-violet-600 bg-violet-50',
    icon: Sparkles,
  },
  reviewed: {
    label: 'Revisado',
    variant: 'outline',
    className: 'border-orange-500 text-orange-600 bg-orange-50',
    icon: Eye,
  },
  approved: {
    label: 'Aprovado',
    variant: 'outline',
    className: 'border-blue-500 text-blue-600 bg-blue-50',
    icon: Check,
  },
  scheduled: {
    label: 'Agendado',
    variant: 'default',
    className: 'bg-amber-500 text-white hover:bg-amber-600',
    icon: Clock,
  },
  published: {
    label: 'Publicado',
    variant: 'default',
    className: 'bg-green-500 text-white hover:bg-green-600',
    icon: CheckCircle,
  },
};

const STATUS_OPTIONS_WORDPRESS: Array<{ value: PostStatus; label: string; icon: React.ElementType }> = [
  { value: 'draft', label: 'Rascunho', icon: FileText },
  { value: 'ai_generated', label: 'Gerado por IA', icon: Sparkles },
  { value: 'reviewed', label: 'Revisado', icon: Eye },
  { value: 'approved', label: 'Aprovado', icon: Check },
  { value: 'published', label: 'Publicado', icon: CheckCircle },
];

const STATUS_OPTIONS_DEFAULT: Array<{ value: PostStatus; label: string; icon: React.ElementType }> = [
  { value: 'draft', label: 'Rascunho', icon: FileText },
  { value: 'approved', label: 'Aprovado', icon: Check },
  { value: 'scheduled', label: 'Agendado', icon: Clock },
  { value: 'published', label: 'Publicado', icon: CheckCircle },
];

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export function PostStatusDropdown({ status, customStatusId, onStatusChange, isLoading = false, channel, clientId }: PostStatusDropdownProps) {
  const { data: customStatuses = [] } = useClientPostStatuses(clientId);
  const hasCustomStatuses = customStatuses.length > 0;

  // Find current custom status
  const currentCustomStatus = hasCustomStatuses
    ? customStatuses.find(s => s.id === customStatusId) || customStatuses[0]
    : null;

  if (hasCustomStatuses) {
    const activeStatus = currentCustomStatus || customStatuses[0];
    const IconComponent = ICON_MAP[activeStatus.icon] || Circle;
    const textColor = getContrastColor(activeStatus.color);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className="group inline-flex cursor-pointer items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
            disabled={isLoading}
          >
            <Badge 
              className={cn('pr-1.5 transition-all', !isLoading && 'hover:opacity-80')}
              style={{ backgroundColor: activeStatus.color, color: textColor, borderColor: activeStatus.color }}
            >
              {isLoading ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <IconComponent className="mr-1 h-3 w-3" />
              )}
              {activeStatus.name}
              <ChevronDown className="ml-1 h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="z-50 bg-popover">
          {customStatuses.map((cs) => {
            const OptionIcon = ICON_MAP[cs.icon] || Circle;
            return (
              <DropdownMenuItem
                key={cs.id}
                onClick={() => onStatusChange('draft', cs.id)}
                className={cn('cursor-pointer', customStatusId === cs.id && 'bg-accent')}
              >
                <span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ backgroundColor: cs.color }} />
                <OptionIcon className="mr-2 h-4 w-4" />
                {cs.name}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Fallback: default system statuses
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className="group inline-flex cursor-pointer items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
          disabled={isLoading}
        >
          <Badge 
            variant={config.variant} 
            className={cn(
              config.className, 
              'pr-1.5 transition-all',
              !isLoading && 'hover:opacity-80'
            )}
          >
            {isLoading ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Icon className="mr-1 h-3 w-3" />
            )}
            {config.label}
            <ChevronDown className="ml-1 h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="z-50 bg-popover">
        {(channel === 'wordpress' ? STATUS_OPTIONS_WORDPRESS : STATUS_OPTIONS_DEFAULT).map((option) => {
          const OptionIcon = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onStatusChange(option.value)}
              className={cn(
                'cursor-pointer',
                status === option.value && 'bg-accent'
              )}
            >
              <OptionIcon className="mr-2 h-4 w-4" />
              {option.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
