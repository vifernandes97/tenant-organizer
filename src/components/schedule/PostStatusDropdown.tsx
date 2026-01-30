import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { FileText, Check, Clock, CheckCircle, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type PostStatus = Database['public']['Enums']['post_status'];

interface PostStatusDropdownProps {
  status: PostStatus;
  onStatusChange: (status: PostStatus) => void;
  isLoading?: boolean;
}

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

const STATUS_OPTIONS: Array<{ value: PostStatus; label: string; icon: React.ElementType }> = [
  { value: 'draft', label: 'Rascunho', icon: FileText },
  { value: 'approved', label: 'Aprovado', icon: Check },
  { value: 'scheduled', label: 'Agendado', icon: Clock },
  { value: 'published', label: 'Publicado', icon: CheckCircle },
];

export function PostStatusDropdown({ status, onStatusChange, isLoading = false }: PostStatusDropdownProps) {
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
        {STATUS_OPTIONS.map((option) => {
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
