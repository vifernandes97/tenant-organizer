import { useState, useMemo, useCallback } from 'react';
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
import { groupPosts } from '@/hooks/useGroupedPosts';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { usePosts, useBacklogPosts, useRescheduleGroup, PostWithImages } from '@/hooks/usePosts';
import { PostGroup } from '@/hooks/useGroupedPosts';
import { ScheduleCalendar } from '@/components/schedule/ScheduleCalendar';
import { ScheduleWeekView } from '@/components/schedule/ScheduleWeekView';
import { ScheduleFilters } from '@/components/schedule/ScheduleFilters';
import { ActiveFilterChips } from '@/components/schedule/ActiveFilterChips';
import { PostForm } from '@/components/schedule/PostForm';
import { GroupPostDetails } from '@/components/schedule/GroupPostDetails';
import { BacklogPanel } from '@/components/schedule/BacklogPanel';
import { STATUS_ACCENT_CLASS } from '@/components/schedule/statusStyles';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type PostStatus = Database['public']['Enums']['post_status'];
type SocialChannel = Database['public']['Enums']['social_channel'];
type ViewMode = 'month' | 'week';

export default function Schedule() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [clientFilter, setClientFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<PostStatus[]>([]);
  const [channelFilter, setChannelFilter] = useState<SocialChannel[]>([]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'month') {
      return {
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
      };
    } else {
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
      return {
        start: weekStart,
        end: endOfWeek(currentWeek, { weekStartsOn: 0 }),
      };
    }
  }, [viewMode, currentMonth, currentWeek]);

  const { data: posts = [], isLoading } = usePosts({
    month: currentMonth,
    clientId: clientFilter,
    status: statusFilter.length > 0 ? statusFilter : undefined,
    channel: channelFilter.length > 0 ? channelFilter : undefined,
  });

  const { data: backlogPosts = [], isLoading: isBacklogLoading } = useBacklogPosts({
    clientId: clientFilter,
    status: statusFilter.length > 0 ? statusFilter : undefined,
    channel: channelFilter.length > 0 ? channelFilter : undefined,
  });


  // Derive selectedGroup from fresh data
  const allGroups = useMemo(() => groupPosts([...posts, ...backlogPosts]), [posts, backlogPosts]);
  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return allGroups.find(g => g.groupId === selectedGroupId) || null;
  }, [selectedGroupId, allGroups]);

  const queryClient = useQueryClient();
  const rescheduleGroup = useRescheduleGroup();

  const handleReschedule = useCallback((draggedPosts: { id: string; scheduled_at: string }[], newDate: Date) => {
    // Check in both scheduled and backlog posts
    const allPosts = [...posts, ...backlogPosts];
    const fullPosts = draggedPosts
      .map(dp => allPosts.find(p => p.id === dp.id))
      .filter(Boolean) as PostWithImages[];
    
    if (fullPosts.length > 0) {
      rescheduleGroup.mutate({ posts: fullPosts, newDate });
    }
  }, [posts, backlogPosts, rescheduleGroup]);

  const handleUnschedule = useCallback(async (postIds: string[]) => {
    const { error } = await supabase
      .from('posts')
      .update({ scheduled_at: null })
      .in('id', postIds);

    if (error) {
      toast.error('Erro ao mover para backlog');
      return;
    }

    toast.success('Post movido para o backlog');
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    queryClient.invalidateQueries({ queryKey: ['backlog-posts'] });
  }, [queryClient]);

  const stats = useMemo(() => {
    return {
      pending: posts.filter((p) => p.status === 'draft' || p.status === 'ai_generated' || p.status === 'reviewed').length,
      draft: posts.filter((p) => p.status === 'draft').length,
      approved: posts.filter((p) => p.status === 'approved').length,
      scheduled: posts.filter((p) => p.status === 'scheduled').length,
      published: posts.filter((p) => p.status === 'published').length,
    };
  }, [posts]);

  // Toggle a status set as the only filter (acts like "show only X")
  const toggleStatusOnly = useCallback((targets: PostStatus[]) => {
    const isActive =
      statusFilter.length === targets.length &&
      targets.every((s) => statusFilter.includes(s));
    setStatusFilter(isActive ? [] : targets);
  }, [statusFilter]);

  const isStatusActive = (targets: PostStatus[]) =>
    statusFilter.length === targets.length &&
    targets.every((s) => statusFilter.includes(s));

  // Period shortcuts
  const goToThisWeek = () => {
    const today = new Date();
    setViewMode('week');
    setCurrentWeek(today);
    setCurrentMonth(today);
  };

  const goToNext30Days = () => {
    const today = new Date();
    setViewMode('month');
    setCurrentMonth(today);
  };

  const goToPrevious = () => {
    if (viewMode === 'month') {
      setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else {
      setCurrentWeek((prev) => addDays(prev, -7));
    }
  };

  const goToNext = () => {
    if (viewMode === 'month') {
      setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    } else {
      setCurrentWeek((prev) => addDays(prev, 7));
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setCurrentWeek(today);
  };

  const handlePostClick = (group: PostGroup) => {
    setSelectedGroupId(group.groupId);
    setIsDetailsOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setDefaultDate(date);
    setSelectedGroupId(null);
    setIsFormOpen(true);
  };

  const handleNewPost = () => {
    setDefaultDate(undefined);
    setSelectedGroupId(null);
    setIsFormOpen(true);
  };

  const handleEditPost = () => {
    setIsDetailsOpen(false);
    // For editing, pass the primary post to the form
    setIsFormOpen(true);
  };

  const clearFilters = () => {
    setClientFilter(undefined);
    setStatusFilter([]);
    setChannelFilter([]);
  };

  const handleViewModeChange = (value: string) => {
    if (value === 'month' || value === 'week') {
      setViewMode(value);
    }
  };

  // Display label based on view mode
  const dateLabel = useMemo(() => {
    if (viewMode === 'month') {
      return format(currentMonth, 'MMMM yyyy', { locale: ptBR });
    } else {
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
      return `${format(weekStart, 'd MMM', { locale: ptBR })} - ${format(weekEnd, 'd MMM yyyy', { locale: ptBR })}`;
    }
  }, [viewMode, currentMonth, currentWeek]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cronograma</h1>
          <p className="text-muted-foreground">
            Gerencie os posts agendados de seus clientes
          </p>
        </div>
        <Button onClick={handleNewPost}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Post
        </Button>
      </div>

      {/* Stats — clickable as quick status filters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {([
          { key: 'pending', label: 'Pend. aprovação', value: stats.pending, accent: STATUS_ACCENT_CLASS.pending, valueClass: 'text-orange-600', targets: ['draft', 'ai_generated', 'reviewed'] as PostStatus[] },
          { key: 'draft', label: 'Rascunhos', value: stats.draft, accent: STATUS_ACCENT_CLASS.draft, valueClass: 'text-muted-foreground', targets: ['draft'] as PostStatus[] },
          { key: 'approved', label: 'Aprovados', value: stats.approved, accent: STATUS_ACCENT_CLASS.approved, valueClass: 'text-blue-600', targets: ['approved'] as PostStatus[] },
          { key: 'scheduled', label: 'Agendados', value: stats.scheduled, accent: STATUS_ACCENT_CLASS.scheduled, valueClass: 'text-amber-500', targets: ['scheduled'] as PostStatus[] },
          { key: 'published', label: 'Publicados', value: stats.published, accent: STATUS_ACCENT_CLASS.published, valueClass: 'text-green-500', targets: ['published'] as PostStatus[] },
        ]).map((card) => {
          const active = isStatusActive(card.targets);
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => toggleStatusOnly(card.targets)}
              aria-pressed={active}
              className={cn(
                'group relative overflow-hidden rounded-lg border bg-card p-3 text-left transition-all hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active && 'border-primary ring-2 ring-primary/30 shadow-sm',
              )}
            >
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className={cn('text-2xl font-bold', card.valueClass)}>{card.value}</p>
              <span className={cn('absolute bottom-0 left-0 right-0 h-1', card.accent)} />
            </button>
          );
        })}
      </div>

      {/* Filters and Navigation */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday} className="min-w-[200px]">
            <CalendarDays className="mr-2 h-4 w-4" />
            <span className="capitalize">{dateLabel}</span>
          </Button>
          <Button variant="outline" size="icon" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* View Mode Toggle */}
          <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange} className="ml-2">
            <ToggleGroupItem value="week" aria-label="Visualização semanal" className="text-xs">
              Semana
            </ToggleGroupItem>
            <ToggleGroupItem value="month" aria-label="Visualização mensal" className="text-xs">
              Mês
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Period shortcuts */}
          <div className="ml-2 flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={goToThisWeek} className="h-8 px-2 text-xs">
              Esta semana
            </Button>
            <Button variant="ghost" size="sm" onClick={goToNext30Days} className="h-8 px-2 text-xs">
              Próx. 30 dias
            </Button>
          </div>
        </div>

        {/* Filters */}
        <ScheduleFilters
          clientId={clientFilter}
          status={statusFilter}
          channel={channelFilter}
          onClientChange={setClientFilter}
          onStatusChange={setStatusFilter}
          onChannelChange={setChannelFilter}
          onClear={clearFilters}
        />
      </div>

      {/* Active filter chips */}
      <ActiveFilterChips
        clientId={clientFilter}
        status={statusFilter}
        channel={channelFilter}
        onClientChange={setClientFilter}
        onStatusChange={setStatusFilter}
        onChannelChange={setChannelFilter}
        onClear={clearFilters}
      />


      {/* Calendar + Backlog */}
      <div className="flex gap-4">
        {/* Backlog Panel */}
        <BacklogPanel
          posts={backlogPosts}
          isLoading={isBacklogLoading}
          onPostClick={handlePostClick}
          onUnschedule={handleUnschedule}
        />

        {/* Calendar */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex h-[400px] items-center justify-center">
              <div className="text-muted-foreground">Carregando...</div>
            </div>
          ) : viewMode === 'month' ? (
            <ScheduleCalendar
              month={currentMonth}
              posts={posts}
              onPostClick={handlePostClick}
              onDayClick={handleDayClick}
              onReschedule={handleReschedule}
            />
          ) : (
            <ScheduleWeekView
              week={currentWeek}
              posts={posts}
              onPostClick={handlePostClick}
              onDayClick={handleDayClick}
              onReschedule={handleReschedule}
            />
          )}
        </div>
      </div>

      {/* Post Form Dialog */}
      <PostForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        post={selectedGroup?.posts[0] || null}
        defaultDate={defaultDate}
      />

      {/* Group Post Details Modal */}
      <GroupPostDetails
        key={selectedGroup?.groupId || 'empty'}
        group={selectedGroup}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onEdit={handleEditPost}
      />
    </div>
  );
}
