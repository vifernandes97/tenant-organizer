import { Badge } from '@/components/ui/badge';
import { FileText, Check, Clock, CheckCircle, Sparkles, Eye } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type PostStatus = Database['public']['Enums']['post_status'];

interface PostStatusBadgeProps {
  status: PostStatus;
  showIcon?: boolean;
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

export function PostStatusBadge({ status, showIcon = true }: PostStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      {showIcon && <Icon className="mr-1 h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
