import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useCaptionHistory, type CaptionHistoryEntry } from '@/hooks/useCaptionHistory';
import { History, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CaptionHistoryDialogProps {
  postId: string | null;
  currentCaption: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (caption: string) => Promise<void> | void;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function CaptionHistoryDialog({
  postId,
  currentCaption,
  open,
  onOpenChange,
  onRestore,
}: CaptionHistoryDialogProps) {
  const { data: history = [], isLoading } = useCaptionHistory(postId, open);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleRestore = async (entry: CaptionHistoryEntry) => {
    if (!entry.caption && !currentCaption) return;
    setRestoringId(entry.id);
    try {
      await onRestore(entry.caption || '');
      toast.success('Legenda restaurada');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao restaurar legenda');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de versões da legenda
          </DialogTitle>
          <DialogDescription>
            Cada alteração da legenda é registrada automaticamente. Restaurar substitui a legenda atual pela versão escolhida (a atual é salva no histórico antes da troca).
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma versão anterior registrada ainda.
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, idx) => (
                <div key={entry.id} className="rounded-md border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">v{history.length - idx}</Badge>
                      <span>{formatDate(entry.created_at)}</span>
                      {entry.editor_name && <span>· por {entry.editor_name}</span>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={restoringId === entry.id}
                      onClick={() => handleRestore(entry)}
                    >
                      {restoringId === entry.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-1 h-3 w-3" />
                      )}
                      Restaurar
                    </Button>
                  </div>
                  <Separator className="mb-2" />
                  <div
                    className="prose prose-sm max-w-none text-sm dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: entry.caption || '<em class="text-muted-foreground">(vazio)</em>' }}
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
