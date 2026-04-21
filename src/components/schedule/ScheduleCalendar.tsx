import { useMemo, useState, DragEvent } from 'react';
import { PostWithImages } from '@/hooks/usePosts';
import { PostGroup, groupPosts } from '@/hooks/useGroupedPosts';
import { GroupedPostCard } from './GroupedPostCard';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';

interface ScheduleCalendarProps {
  month: Date;
  posts: PostWithImages[];
  onPostClick: (group: PostGroup) => void;
  onDayClick: (date: Date) => void;
  onReschedule?: (posts: { id: string; scheduled_at: string }[], newDate: Date) => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function ScheduleCalendar({ month, posts, onPostClick, onDayClick, onReschedule }: ScheduleCalendarProps) {
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const calendarDays = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const startOffset = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, monthIndex, i));
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) for (let i = 0; i < remaining; i++) days.push(null);
    return days;
  }, [month]);

  const groupedPosts = useMemo(() => groupPosts(posts), [posts]);

  const groupsByDay = useMemo(() => {
    const map = new Map<string, PostGroup[]>();
    groupedPosts.forEach((group) => {
      const date = new Date(group.scheduledAt);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(group);
    });
    return map;
  }, [groupedPosts]);

  const today = new Date();
  const isToday = (date: Date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const getGroupsForDay = (date: Date) => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return groupsByDay.get(key) || [];
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (date: Date) => {
    setDragOverDate(date.toISOString());
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, date: Date) => {
    e.preventDefault();
    setDragOverDate(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      onReschedule?.(data.posts, date);
    } catch {}
  };

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-3 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((date, index) => {
          if (!date) {
            return (
              <div
                key={`empty-${index}`}
                className="min-h-[140px] border-b border-r bg-muted/30 p-1 last:border-r-0"
              />
            );
          }

          const dayGroups = getGroupsForDay(date);
          const maxVisible = 2;
          const hiddenCount = dayGroups.length - maxVisible;
          const isDragOver = dragOverDate === date.toISOString();

          return (
            <div
              key={date.toISOString()}
              onDragOver={handleDragOver}
              onDragEnter={() => handleDragEnter(date)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, date)}
              className={`group relative min-h-[140px] border-b border-r p-1 transition-all last:border-r-0 hover:bg-muted/30 ${
                isToday(date) ? 'bg-primary/5' : ''
              } ${isDragOver ? 'z-10 scale-[1.02] animate-pulse bg-primary/15 ring-2 ring-primary ring-inset shadow-lg' : ''}`}
            >
              {/* Day Number */}
              <div className="mb-1 flex items-center justify-between px-1">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                    isToday(date)
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : 'text-foreground'
                  }`}
                >
                  {date.getDate()}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => onDayClick(date)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Post Groups */}
              <div className="space-y-1">
                {dayGroups.slice(0, maxVisible).map((group) => (
                  <GroupedPostCard 
                    key={group.groupId} 
                    group={group} 
                    onClick={() => onPostClick(group)} 
                  />
                ))}
                {hiddenCount > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full rounded bg-muted px-2 py-1 text-center text-xs text-muted-foreground hover:bg-muted/80">
                        +{hiddenCount} mais
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="start">
                      <p className="mb-2 text-sm font-medium">
                        Posts de {date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                      </p>
                      <ScrollArea className="max-h-[300px]">
                        <div className="space-y-2 pr-2">
                          {dayGroups.map((group) => (
                            <GroupedPostCard 
                              key={group.groupId} 
                              group={group} 
                              onClick={() => onPostClick(group)} 
                            />
                          ))}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
