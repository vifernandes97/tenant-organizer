import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Video, FileText, Image as ImageIcon, MessageSquare, Layers, CalendarX } from 'lucide-react';
import { PostWithImages } from '@/hooks/usePosts';
import { groupPosts, PostGroup } from '@/hooks/useGroupedPosts';
import { PostStatusBadge } from './PostStatusBadge';
import { ChannelBadges } from '@/components/clients/ChannelBadges';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { PostHoverPreview } from './PostHoverPreview';
import { extractPlainText } from '@/lib/textUtils';

interface ScheduleListViewProps {
  month: Date;
  posts: PostWithImages[];
  onPostClick: (group: PostGroup) => void;
}

interface DayBucket {
  date: Date;
  key: string;
  groups: PostGroup[];
}

export function ScheduleListView({ month, posts, onPostClick }: ScheduleListViewProps) {
  const days = useMemo<DayBucket[]>(() => {
    const interval = { start: startOfMonth(month), end: endOfMonth(month) };
    const groups = groupPosts(posts).filter((g) => {
      if (!g.scheduledAt) return false;
      try {
        return isWithinInterval(parseISO(g.scheduledAt), interval);
      } catch {
        return false;
      }
    });

    const map = new Map<string, DayBucket>();
    groups.forEach((g) => {
      const date = parseISO(g.scheduledAt!);
      const key = format(date, 'yyyy-MM-dd');
      if (!map.has(key)) {
        map.set(key, { date, key, groups: [] });
      }
      map.get(key)!.groups.push(g);
    });

    const buckets = Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    buckets.forEach((b) => {
      b.groups.sort(
        (a, z) => parseISO(a.scheduledAt!).getTime() - parseISO(z.scheduledAt!).getTime()
      );
    });
    return buckets;
  }, [posts, month]);

  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed bg-card py-16 text-center">
        <CalendarX className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Nenhum post agendado neste período</p>
        <p className="text-xs text-muted-foreground">
          Use os botões de navegação para ver outro mês.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card">
      {days.map((day) => (
        <div key={day.key}>
          <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-2 backdrop-blur">
            <h3 className="text-sm font-semibold capitalize text-foreground">
              {format(day.date, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h3>
            <span className="text-xs text-muted-foreground">
              {day.groups.length} {day.groups.length === 1 ? 'post' : 'posts'}
            </span>
          </div>
          <div className="divide-y">
            {day.groups.map((group) => (
              <ListPostRow key={group.groupId} group={group} onClick={() => onPostClick(group)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ListPostRowProps {
  group: PostGroup;
  onClick: () => void;
}

function ListPostRow({ group, onClick }: ListPostRowProps) {
  const primary = group.posts[0];
  const firstMedia = primary.post_images?.[0];
  const mediaType = firstMedia?.media_type;
  const isImage = !!firstMedia && (!mediaType || mediaType.startsWith('image'));
  const isVideo = mediaType?.startsWith('video');
  const isPdf = mediaType?.includes('pdf');

  const displayTitle =
    group.title || extractPlainText(primary.caption || '').substring(0, 60) || 'Sem título';

  const time = group.scheduledAt ? format(parseISO(group.scheduledAt), 'HH:mm') : '--:--';
  const postsCount = group.posts.length;

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          onClick={onClick}
          className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
        >
          {/* Time */}
          <div className="w-12 shrink-0 font-mono text-xs text-muted-foreground">{time}</div>

          {/* Thumbnail */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
            {isImage ? (
              <img
                src={firstMedia!.image_url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : isVideo ? (
              <Video className="h-4 w-4 text-muted-foreground" />
            ) : isPdf ? (
              <FileText className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* Title + client */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{displayTitle}</p>
            {group.clientName && (
              <p className="truncate text-xs text-muted-foreground">{group.clientName}</p>
            )}
          </div>

          {/* Channels */}
          <div className="shrink-0">
            <ChannelBadges channels={group.channels} iconOnly size="sm" />
          </div>

          {/* +N posts */}
          {postsCount > 1 && (
            <span className="hidden shrink-0 items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground sm:inline-flex">
              <Layers className="h-3 w-3" />
              {postsCount}
            </span>
          )}

          {/* Status */}
          <div className="shrink-0">
            <PostStatusBadge
              status={primary.status}
              showIcon={false}
              customStatusId={primary.custom_status_id}
              clientId={primary.client_id}
            />
          </div>

          {/* Comments */}
          {group.totalOpenComments > 0 && (
            <div className="flex shrink-0 items-center gap-1 text-primary">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{group.totalOpenComments}</span>
            </div>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-80 p-0">
        <PostHoverPreview
          title={group.title}
          caption={primary.caption}
          image={firstMedia?.image_url}
          mediaType={firstMedia?.media_type}
          channels={group.channels}
          status={primary.status}
          customStatusId={primary.custom_status_id}
          clientId={primary.client_id}
          clientName={group.clientName}
          scheduledAt={group.scheduledAt}
          openComments={group.totalOpenComments}
          postsCount={postsCount}
        />
      </HoverCardContent>
    </HoverCard>
  );
}
