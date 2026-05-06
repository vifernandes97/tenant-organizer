import { DragEvent } from 'react';
import { BrainstormIdea, BrainstormIdeaStatus } from '@/hooks/useBrainstormIdeas';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Pencil, Trash2, Send, ArchiveRestore } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export const STATUS_CONFIG: Record<
  BrainstormIdeaStatus,
  { label: string; badgeClass: string; borderClass: string; dotClass: string }
> = {
  nova: {
    label: 'Nova',
    badgeClass:
      'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    borderClass: 'border-l-muted-foreground/40',
    dotClass: 'bg-muted-foreground/60',
  },
  dar_sequencia: {
    label: 'Dar sequência',
    badgeClass:
      'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400',
    borderClass: 'border-l-green-500',
    dotClass: 'bg-green-500',
  },
  reformular: {
    label: 'Reformular',
    badgeClass:
      'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400',
    borderClass: 'border-l-yellow-500',
    dotClass: 'bg-yellow-500',
  },
  abandonar: {
    label: 'Abandonar',
    badgeClass: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
    borderClass: 'border-l-destructive',
    dotClass: 'bg-destructive',
  },
  arquivada: {
    label: 'Arquivada',
    badgeClass: 'bg-muted text-muted-foreground hover:bg-muted/80',
    borderClass: 'border-l-muted-foreground/30',
    dotClass: 'bg-muted-foreground/40',
  },
};

interface BrainstormCardProps {
  idea: BrainstormIdea;
  onEdit: (idea: BrainstormIdea) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: BrainstormIdeaStatus) => void;
  onSendToBacklog: (idea: BrainstormIdea) => void;
  draggable?: boolean;
}

export function BrainstormCard({
  idea,
  onEdit,
  onDelete,
  onStatusChange,
  onSendToBacklog,
  draggable = false,
}: BrainstormCardProps) {
  const config = STATUS_CONFIG[idea.status];

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ ideaId: idea.id, currentStatus: idea.status }),
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const relativeDate = formatDistanceToNow(new Date(idea.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <Card
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      onClick={() => onEdit(idea)}
      className={cn(
        'group relative cursor-pointer border-l-4 transition-all',
        'hover:shadow-md hover:-translate-y-0.5',
        config.borderClass,
      )}
    >
      <div className="p-4 space-y-2">
        {/* Header: title + menu */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug pr-6 line-clamp-2">
            {idea.title}
          </h3>
          <div onClick={(e) => e.stopPropagation()} className="absolute top-2 right-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Mudar status</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {(Object.keys(STATUS_CONFIG) as BrainstormIdeaStatus[]).map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => onStatusChange(idea.id, s)}
                        className={idea.status === s ? 'font-semibold' : ''}
                      >
                        <span className={cn('mr-2 h-2 w-2 rounded-full', STATUS_CONFIG[s].dotClass)} />
                        {STATUS_CONFIG[s].label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(idea.id)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status badge */}
        <Badge className={cn('border-0 text-xs', config.badgeClass)}>
          <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', config.dotClass)} />
          {config.label}
        </Badge>

        {/* Description */}
        {idea.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
            {idea.description}
          </p>
        )}

        {/* Footer: relative date + hover actions */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground/70">{relativeDate}</span>
          <div
            className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onSendToBacklog(idea)}
            >
              <Send className="mr-1 h-3 w-3" />
              Backlog
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onEdit(idea)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
