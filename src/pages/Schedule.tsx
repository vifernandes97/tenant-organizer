import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react';
import { usePosts } from '@/hooks/usePosts';
import { PostGroup } from '@/hooks/useGroupedPosts';
import { ScheduleCalendar } from '@/components/schedule/ScheduleCalendar';
import { ScheduleFilters } from '@/components/schedule/ScheduleFilters';
import { PostForm } from '@/components/schedule/PostForm';
import { GroupPostDetails } from '@/components/schedule/GroupPostDetails';
import type { Database } from '@/integrations/supabase/types';

type PostStatus = Database['public']['Enums']['post_status'];
type SocialChannel = Database['public']['Enums']['social_channel'];

export default function Schedule() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [clientFilter, setClientFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<PostStatus[]>([]);
  const [channelFilter, setChannelFilter] = useState<SocialChannel[]>([]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PostGroup | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();

  const { data: posts = [], isLoading } = usePosts({
    month: currentMonth,
    clientId: clientFilter,
    status: statusFilter.length > 0 ? statusFilter : undefined,
    channel: channelFilter.length > 0 ? channelFilter : undefined,
  });

  const stats = useMemo(() => {
    return {
      total: posts.length,
      draft: posts.filter((p) => p.status === 'draft').length,
      approved: posts.filter((p) => p.status === 'approved').length,
      scheduled: posts.filter((p) => p.status === 'scheduled').length,
      published: posts.filter((p) => p.status === 'published').length,
    };
  }, [posts]);

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
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
    setDefaultDate(new Date());
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

  const monthName = currentMonth.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

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
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday} className="min-w-[180px]">
            <CalendarDays className="mr-2 h-4 w-4" />
            <span className="capitalize">{monthName}</span>
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
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

      {/* Calendar */}
      {isLoading ? (
        <div className="flex h-[400px] items-center justify-center">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      ) : (
        <ScheduleCalendar
          month={currentMonth}
          posts={posts}
          onPostClick={handlePostClick}
          onDayClick={handleDayClick}
        />
      )}

      {/* Post Form Dialog */}
      <PostForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        post={selectedGroup?.posts[0] || null}
        defaultDate={defaultDate}
      />

      {/* Group Post Details Modal */}
      <GroupPostDetails
        group={selectedGroup}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onEdit={handleEditPost}
      />
    </div>
  );
}
