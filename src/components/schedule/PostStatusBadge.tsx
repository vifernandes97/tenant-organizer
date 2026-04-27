import { Badge } from '@/components/ui/badge';
import { FileText, Check, Clock, CheckCircle, Sparkles, Eye } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { useClientPostStatuses } from '@/hooks/useClientPostStatuses';

type PostStatus = Database['public']['Enums']['post_status'];

interface PostStatusBadgeProps {
  status: PostStatus;
  showIcon?: boolean;
  customStatusId?: string | null;
  clientId?: string | null;
}

const statusConfig: Record<PostStatus, { label: string; variant: 'secondary' | 'outline' | 'default'; className: string; icon: React.ElementType }> = {
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

export function PostStatusBadge({ status, showIcon = true, customStatusId, clientId, channel }: PostStatusBadgeProps) {
  const { data: customStatuses } = useClientPostStatuses(clientId, channel);

  // If client has custom statuses, use them
  if (customStatuses && customStatuses.length > 0) {
    const customStatus = customStatusId
      ? customStatuses.find(s => s.id === customStatusId)
      : customStatuses[0];

    if (customStatus) {
      return (
        <Badge
          variant="outline"
          className="border-transparent text-white"
          style={{ backgroundColor: customStatus.color }}
        >
          {customStatus.name}
        </Badge>
      );
    }
  }

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      {showIcon && <Icon className="mr-1 h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
