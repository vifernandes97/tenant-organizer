import { DragEvent, useState } from 'react';
import { BrainstormIdea, BrainstormIdeaStatus } from '@/hooks/useBrainstormIdeas';
import { BrainstormCard, STATUS_CONFIG } from './BrainstormCard';
import { cn } from '@/lib/utils';

interface BrainstormKanbanProps {
  ideas: BrainstormIdea[];
  onEdit: (idea: BrainstormIdea) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: BrainstormIdeaStatus) => void;
  onSendToBacklog: (idea: BrainstormIdea) => void;
}

const COLUMNS: BrainstormIdeaStatus[] = ['nova', 'dar_sequencia', 'reformular', 'abandonar'];

export function BrainstormKanban({
  ideas,
  onEdit,
  onDelete,
  onStatusChange,
  onSendToBacklog,
}: BrainstormKanbanProps) {
  const [dragOverColumn, setDragOverColumn] = useState<BrainstormIdeaStatus | null>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>, status: BrainstormIdeaStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, status: BrainstormIdeaStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.ideaId && data.currentStatus !== status) {
        onStatusChange(data.ideaId, status);
      }
    } catch {
      // ignore invalid drop
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUMNS.map((status) => {
        const config = STATUS_CONFIG[status];
        const columnIdeas = ideas.filter((i) => i.status === status);
        const isDragOver = dragOverColumn === status;

        return (
          <div
            key={status}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
            className={cn(
              'flex flex-col rounded-lg border bg-muted/30 transition-all min-h-[300px]',
              isDragOver && 'ring-2 ring-primary bg-primary/5 scale-[1.01]',
            )}
          >
            {/* Column header */}
            <div className="flex items-center justify-between gap-2 p-3 border-b">
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', config.dotClass)} />
                <h3 className="text-sm font-semibold">{config.label}</h3>
              </div>
              <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5 min-w-[24px] text-center">
                {columnIdeas.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {columnIdeas.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground/50 italic">
                  Arraste ideias aqui
                </div>
              ) : (
                columnIdeas.map((idea) => (
                  <BrainstormCard
                    key={idea.id}
                    idea={idea}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onStatusChange={onStatusChange}
                    onSendToBacklog={onSendToBacklog}
                    draggable
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
