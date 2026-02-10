import { useMemo, useState, DragEvent } from 'react';
import { startOfWeek, addDays, isToday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PostWithImages } from '@/hooks/usePosts';
import { PostGroup, groupPosts } from '@/hooks/useGroupedPosts';
import { GroupedPostCard } from './GroupedPostCard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';

interface ScheduleWeekViewProps {
  week: Date;
  posts: PostWithImages[];
  onPostClick: (group: PostGroup) => void;
  onDayClick: (date: Date) => void;
  onReschedule?: (posts: { id: string; scheduled_at: string }[], newDate: Date) => void;
}

export function ScheduleWeekView({ week, posts, onPostClick, onDayClick, onReschedule }: ScheduleWeekViewProps) {
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const weekDays = useMemo(() => {
    const sunday = startOfWeek(week, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
  }, [week]);

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
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="border-r py-3 text-center last:border-r-0">
            <span className="text-sm font-medium text-muted-foreground">
              {format(day, 'EEE', { locale: ptBR })}
            </span>
          </div>
        ))}
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7">
        {weekDays.map((day) => {
          const dayGroups = getGroupsForDay(day);
          const isDragOver = dragOverDate === day.toISOString();

          return (
            <div
              key={day.toISOString()}
              onDragOver={handleDragOver}
              onDragEnter={() => handleDragEnter(day)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day)}
              className={`group relative min-h-[450px] border-r p-2 transition-colors last:border-r-0 hover:bg-muted/30 ${
                isToday(day) ? 'bg-primary/5' : ''
              } ${isDragOver ? 'border-primary bg-primary/10' : ''}`}
            >
              {/* Day Number */}
              <div className="mb-2 flex items-center justify-between">
                <div className="flex flex-col">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-base ${
                      isToday(day)
                        ? 'bg-primary font-semibold text-primary-foreground'
                        : 'text-foreground'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    {format(day, 'MMM', { locale: ptBR })}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => onDayClick(day)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Posts */}
              <ScrollArea className="h-[380px]">
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
