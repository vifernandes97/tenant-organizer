import { useMemo } from 'react';
import { PostWithImages } from '@/hooks/usePosts';
import { PostCard } from './PostCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ScheduleCalendarProps {
  month: Date;
  posts: PostWithImages[];
  onPostClick: (post: PostWithImages) => void;
  onDayClick: (date: Date) => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function ScheduleCalendar({ month, posts, onPostClick, onDayClick }: ScheduleCalendarProps) {
  const calendarDays = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    
    const startOffset = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days: (Date | null)[] = [];
    
    // Add empty slots for days before the first of the month
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, monthIndex, i));
    }
    
    // Add empty slots to complete the last week
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 0; i < remaining; i++) {
        days.push(null);
      }
    }
    
    return days;
  }, [month]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, PostWithImages[]>();
    
    posts.forEach((post) => {
      const date = new Date(post.scheduled_at);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(post);
    });
    
    return map;
  }, [posts]);

  const today = new Date();
  const isToday = (date: Date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const getPostsForDay = (date: Date) => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return postsByDay.get(key) || [];
  };

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-sm font-medium text-muted-foreground"
          >
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

          const dayPosts = getPostsForDay(date);
          const maxVisible = 2;
          const hiddenCount = dayPosts.length - maxVisible;

          return (
            <div
              key={date.toISOString()}
              className={`group relative min-h-[140px] border-b border-r p-1 transition-colors last:border-r-0 hover:bg-muted/30 ${
                isToday(date) ? 'bg-primary/5' : ''
              }`}
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

              {/* Posts */}
              <div className="space-y-1">
                {dayPosts.slice(0, maxVisible).map((post) => (
                  <PostCard key={post.id} post={post} onClick={() => onPostClick(post)} />
                ))}
                {hiddenCount > 0 && (
                  <button
                    onClick={() => onDayClick(date)}
                    className="w-full rounded bg-muted px-2 py-1 text-center text-xs text-muted-foreground hover:bg-muted/80"
                  >
                    +{hiddenCount} mais
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
