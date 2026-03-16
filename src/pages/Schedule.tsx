import { useState, useMemo, useCallback } from 'react';
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
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
import { PostForm } from '@/components/schedule/PostForm';
import { GroupPostDetails } from '@/components/schedule/GroupPostDetails';
import { BacklogPanel } from '@/components/schedule/BacklogPanel';
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
  const [selectedGroup, setSelectedGroup] = useState<PostGroup | null>(null);
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

  const stats = useMemo(() => {
    return {
      total: posts.length,
      draft: posts.filter((p) => p.status === 'draft').length,
      approved: posts.filter((p) => p.status === 'approved').length,
      scheduled: posts.filter((p) => p.status === 'scheduled').length,
      published: posts.filter((p) => p.status === 'published').length,
    };
  }, [posts]);

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
    setSelectedGroup(group);
    setIsDetailsOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setDefaultDate(date);
    setSelectedGroup(null);
    setIsFormOpen(true);
  };

  const handleNewPost = () => {
    setDefaultDate(undefined);
    setSelectedGroup(null);
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Rascunhos</p>
          <p className="text-2xl font-bold text-muted-foreground">{stats.draft}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Aprovados</p>
          <p className="text-2xl font-bold text-blue-600">{stats.approved}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Agendados</p>
          <p className="text-2xl font-bold text-amber-500">{stats.scheduled}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Publicados</p>
          <p className="text-2xl font-bold text-green-500">{stats.published}</p>
        </div>
      </div>

      {/* Filters and Navigation */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Navigation */}
        <div className="flex items-center gap-2">
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

      {/* Calendar + Backlog */}
      <div className="flex gap-4">
        {/* Backlog Panel */}
        <BacklogPanel
          posts={backlogPosts}
          isLoading={isBacklogLoading}
          onPostClick={handlePostClick}
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
