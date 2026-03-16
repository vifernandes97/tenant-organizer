import { useState } from 'react';
import { useBrainstormIdeas, BrainstormIdea, BrainstormIdeaStatus } from '@/hooks/useBrainstormIdeas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Lightbulb, Plus, MoreVertical, Pencil, Trash2, Loader2, Send } from 'lucide-react';
import { useCreatePost } from '@/hooks/usePosts';
import { SendToBacklogDialog } from '@/components/brainstorm/SendToBacklogDialog';
import type { Database } from '@/integrations/supabase/types';

type SocialChannel = Database['public']['Enums']['social_channel'];

const STATUS_CONFIG: Record<BrainstormIdeaStatus, { label: string; className: string }> = {
  nova: { label: 'Nova', className: 'bg-secondary text-secondary-foreground hover:bg-secondary/80' },
  dar_sequencia: { label: 'Dar sequência', className: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' },
  reformular: { label: 'Reformular', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400' },
  abandonar: { label: 'Abandonar', className: 'bg-destructive/10 text-destructive hover:bg-destructive/20' },
};

const FILTER_OPTIONS: { value: 'all' | BrainstormIdeaStatus; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'nova', label: 'Nova' },
  { value: 'dar_sequencia', label: 'Dar sequência' },
  { value: 'reformular', label: 'Reformular' },
  { value: 'abandonar', label: 'Abandonar' },
];

export default function Brainstorm() {
  const { ideas, isLoading, createIdea, updateIdea, updateIdeaStatus, deleteIdea } = useBrainstormIdeas();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<BrainstormIdea | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BrainstormIdeaStatus>('all');

  const filteredIdeas = statusFilter === 'all' ? ideas : ideas.filter((i) => i.status === statusFilter);

  const openNew = () => {
    setEditingIdea(null);
    setTitle('');
    setDescription('');
    setDialogOpen(true);
  };

  const openEdit = (idea: BrainstormIdea) => {
    setEditingIdea(idea);
    setTitle(idea.title);
    setDescription(idea.description ?? '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    if (editingIdea) {
      await updateIdea.mutateAsync({ id: editingIdea.id, title, description });
    } else {
      await createIdea.mutateAsync({ title, description });
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteIdea.mutateAsync(id);
  };

  const handleStatusChange = (id: string, status: BrainstormIdeaStatus) => {
    updateIdeaStatus.mutate({ id, status });
  };

  const isSaving = createIdea.isPending || updateIdea.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Brainstorm</h1>
          <p className="text-sm text-muted-foreground">Registre e organize suas ideias.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova ideia
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={statusFilter === opt.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Lightbulb className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Nenhuma ideia encontrada.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredIdeas.map((idea) => (
            <Card key={idea.id} className="group relative">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-2 pr-8">
                  <CardTitle className="text-base font-semibold leading-snug">
                    {idea.title}
                  </CardTitle>
                  {/* Status badge dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="focus:outline-none">
                        <Badge
                          className={`cursor-pointer border-0 ${STATUS_CONFIG[idea.status].className}`}
                        >
                          {STATUS_CONFIG[idea.status].label}
                        </Badge>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {(Object.keys(STATUS_CONFIG) as BrainstormIdeaStatus[]).map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => handleStatusChange(idea.id, s)}
                          className={idea.status === s ? 'font-semibold' : ''}
                        >
                          {STATUS_CONFIG[s].label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(idea)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(idea.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              {idea.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {idea.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingIdea ? 'Editar ideia' : 'Nova ideia'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="Título da ideia"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Descrição (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!title.trim() || isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingIdea ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
