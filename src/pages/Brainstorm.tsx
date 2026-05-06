import { useState, useEffect, useMemo, useRef } from 'react';
import { useBrainstormIdeas, BrainstormIdea, BrainstormIdeaStatus } from '@/hooks/useBrainstormIdeas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Lightbulb,
  Plus,
  Loader2,
  Search,
  X,
  LayoutGrid,
  Columns3,
  ArrowDownUp,
} from 'lucide-react';
import { useCreatePost } from '@/hooks/usePosts';
import { SendToBacklogDialog } from '@/components/brainstorm/SendToBacklogDialog';
import { BrainstormCard, STATUS_CONFIG } from '@/components/brainstorm/BrainstormCard';
import { BrainstormKanban } from '@/components/brainstorm/BrainstormKanban';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type SocialChannel = Database['public']['Enums']['social_channel'];
type ViewMode = 'grid' | 'kanban';
type SortMode = 'recent' | 'oldest' | 'az' | 'status';
type FilterValue = 'all' | BrainstormIdeaStatus;

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'nova', label: 'Nova' },
  { value: 'dar_sequencia', label: 'Dar sequência' },
  { value: 'reformular', label: 'Reformular' },
  { value: 'abandonar', label: 'Abandonar' },
  { value: 'arquivada', label: 'Arquivadas' },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigas' },
  { value: 'az', label: 'Título (A-Z)' },
  { value: 'status', label: 'Status' },
];

const STATUS_ORDER: BrainstormIdeaStatus[] = ['nova', 'dar_sequencia', 'reformular', 'abandonar', 'arquivada'];

const VIEW_KEY = 'brainstorm:view';
const SORT_KEY = 'brainstorm:sort';

export default function Brainstorm() {
  const { ideas, isLoading, createIdea, updateIdea, updateIdeaStatus, deleteIdea } =
    useBrainstormIdeas();
  const createPost = useCreatePost();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<BrainstormIdea | null>(null);
  const [backlogIdea, setBacklogIdea] = useState<BrainstormIdea | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Filter / search / sort / view state
  const [statusFilter, setStatusFilter] = useState<FilterValue>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [quickAdd, setQuickAdd] = useState('');
  const [view, setView] = useState<ViewMode>(
    () => (typeof window !== 'undefined' && (localStorage.getItem(VIEW_KEY) as ViewMode)) || 'grid',
  );
  const [sortMode, setSortMode] = useState<SortMode>(
    () => (typeof window !== 'undefined' && (localStorage.getItem(SORT_KEY) as SortMode)) || 'recent',
  );

  const searchRef = useRef<HTMLInputElement>(null);
  const quickAddRef = useRef<HTMLInputElement>(null);

  // Persist view & sort
  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view);
  }, [view]);
  useEffect(() => {
    localStorage.setItem(SORT_KEY, sortMode);
  }, [sortMode]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Hotkeys: N for new, / for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      if (isTyping) return;

      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openNew();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Counts per status (respect search but not status filter).
  // 'all' counts exclude archived ideas (they have their own chip).
  const counts = useMemo(() => {
    const base = search
      ? ideas.filter(
          (i) =>
            i.title.toLowerCase().includes(search) ||
            (i.description ?? '').toLowerCase().includes(search),
        )
      : ideas;
    const c: Record<FilterValue, number> = {
      all: 0,
      nova: 0,
      dar_sequencia: 0,
      reformular: 0,
      abandonar: 0,
      arquivada: 0,
    };
    base.forEach((i) => {
      c[i.status]++;
      if (i.status !== 'arquivada') c.all++;
    });
    return c;
  }, [ideas, search]);

  // Filtered + sorted
  const visibleIdeas = useMemo(() => {
    let list = ideas;
    if (statusFilter === 'all') {
      list = list.filter((i) => i.status !== 'arquivada');
    } else {
      list = list.filter((i) => i.status === statusFilter);
    }
    if (search) {
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(search) ||
          (i.description ?? '').toLowerCase().includes(search),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortMode) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'az':
          return a.title.localeCompare(b.title, 'pt-BR');
        case 'status':
          return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
        default:
          return 0;
      }
    });
    return sorted;
  }, [ideas, statusFilter, search, sortMode]);

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

  const handleQuickAdd = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const value = quickAdd.trim();
    if (!value) return;
    e.preventDefault();
    setQuickAdd('');
    await createIdea.mutateAsync({ title: value });
    quickAddRef.current?.focus();
  };

  const handleDelete = (id: string) => {
    deleteIdea.mutate(id);
  };

  const handleStatusChange = (id: string, status: BrainstormIdeaStatus) => {
    updateIdeaStatus.mutate({ id, status });
  };

  const handleSendToBacklog = async (clientId: string, channels: SocialChannel[]) => {
    if (!backlogIdea) return;
    await createPost.mutateAsync({
      post: {
        client_id: clientId,
        channels,
        caption: backlogIdea.description || backlogIdea.title,
        status: 'draft',
        is_backlog: true,
      },
      images: [],
    });
    updateIdeaStatus.mutate({ id: backlogIdea.id, status: 'arquivada' });
    setBacklogIdea(null);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setSearchInput('');
  };

  const isSaving = createIdea.isPending || updateIdea.isPending;
  const hasActiveFilters = statusFilter !== 'all' || !!search;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Brainstorm</h1>
          <p className="text-sm text-muted-foreground">
            Registre e organize suas ideias.{' '}
            <span className="hidden md:inline text-xs">
              Pressione <kbd className="px-1 py-0.5 rounded bg-muted text-foreground/70">N</kbd> para
              nova ou <kbd className="px-1 py-0.5 rounded bg-muted text-foreground/70">/</kbd> para
              buscar.
            </span>
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova ideia
        </Button>
      </div>

      {/* Quick add */}
      <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-1.5">
        <Plus className="h-4 w-4 text-muted-foreground/60 shrink-0" />
        <Input
          ref={quickAddRef}
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
          onKeyDown={handleQuickAdd}
          placeholder="Adicionar ideia rápida e pressionar Enter..."
          className="border-0 shadow-none focus-visible:ring-0 px-0 h-8 bg-transparent"
        />
        {createIdea.isPending && quickAdd === '' && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Toolbar: search + sort + view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar ideias..."
            className="pl-9 pr-9 h-9"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
              aria-label="Limpar busca"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sort */}
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="h-9 w-[170px]">
              <ArrowDownUp className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View toggle */}
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && setView(v as ViewMode)}
            className="border rounded-md"
          >
            <ToggleGroupItem value="grid" aria-label="Grade" className="h-9 px-2">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="kanban" aria-label="Kanban" className="h-9 px-2">
              <Columns3 className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Status filter chips */}
      {view === 'grid' && (
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => {
            const isActive = statusFilter === opt.value;
            const config = opt.value !== 'all' ? STATUS_CONFIG[opt.value] : null;
            return (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  isActive
                    ? config
                      ? cn(config.badgeClass, 'border-transparent ring-2 ring-offset-1 ring-offset-background ring-primary/30')
                      : 'bg-primary text-primary-foreground border-transparent'
                    : 'bg-background hover:bg-muted text-muted-foreground border-border',
                )}
              >
                {config && (
                  <span className={cn('h-1.5 w-1.5 rounded-full', config.dotClass)} />
                )}
                {opt.label}
                <span
                  className={cn(
                    'ml-0.5 rounded-full px-1.5 text-[10px] tabular-nums',
                    isActive ? 'bg-background/30' : 'bg-muted',
                  )}
                >
                  {counts[opt.value]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : ideas.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="Nenhuma ideia ainda"
          description="Comece capturando suas ideias rapidamente. Use o campo acima ou clique no botão para criar a primeira."
          actionLabel="Criar primeira ideia"
          onAction={openNew}
        />
      ) : view === 'kanban' ? (
        <BrainstormKanban
          ideas={search ? visibleIdeas : ideas}
          onEdit={openEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onSendToBacklog={setBacklogIdea}
        />
      ) : visibleIdeas.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhuma ideia encontrada"
          description={
            hasActiveFilters
              ? 'Tente ajustar a busca ou os filtros aplicados.'
              : 'Nenhum resultado para a busca atual.'
          }
          actionLabel="Limpar filtros"
          onAction={clearFilters}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleIdeas.map((idea) => (
            <BrainstormCard
              key={idea.id}
              idea={idea}
              onEdit={openEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onSendToBacklog={setBacklogIdea}
            />
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingIdea ? 'Editar ideia' : 'Nova ideia'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              autoFocus
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

      <SendToBacklogDialog
        open={!!backlogIdea}
        onOpenChange={(open) => !open && setBacklogIdea(null)}
        onConfirm={handleSendToBacklog}
        ideaTitle={backlogIdea?.title ?? ''}
        isSaving={createPost.isPending}
      />
    </div>
  );
}
