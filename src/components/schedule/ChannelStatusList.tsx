import { Instagram, Linkedin, Facebook, Twitter, Youtube, Globe } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { PostStatusBadge } from './PostStatusBadge';

type SocialChannel = Database['public']['Enums']['social_channel'];
type PostStatus = Database['public']['Enums']['post_status'];

interface ChannelStatusItem {
  channel: SocialChannel;
  status: PostStatus;
  customStatusId?: string | null;
}

interface ChannelStatusListProps {
  items: ChannelStatusItem[];
  clientId?: string | null;
  showLabel?: boolean;
}

const channelIcons: Record<SocialChannel, { icon: React.ReactNode; label: string; color: string }> = {
  instagram_feed: { icon: <Instagram className="h-3 w-3" />, label: 'IG Feed', color: 'text-pink-600' },
  instagram_reels: { icon: <Instagram className="h-3 w-3" />, label: 'IG Reels', color: 'text-pink-600' },
  instagram_story: { icon: <Instagram className="h-3 w-3" />, label: 'IG Story', color: 'text-pink-600' },
  tiktok: {
    icon: (
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
      </svg>
    ),
    label: 'TikTok',
    color: 'text-cyan-600',
  },
  linkedin: { icon: <Linkedin className="h-3 w-3" />, label: 'LinkedIn', color: 'text-blue-600' },
  facebook: { icon: <Facebook className="h-3 w-3" />, label: 'Facebook', color: 'text-blue-700' },
  twitter: { icon: <Twitter className="h-3 w-3" />, label: 'Twitter', color: 'text-sky-600' },
  youtube: { icon: <Youtube className="h-3 w-3" />, label: 'YouTube', color: 'text-red-600' },
  wordpress: { icon: <Globe className="h-3 w-3" />, label: 'WordPress', color: 'text-slate-600' },
};

export function ChannelStatusList({ items, clientId, showLabel = false }: ChannelStatusListProps) {
  return (
    <div className="flex flex-col gap-1">
      {items.map((item, idx) => {
        const cfg = channelIcons[item.channel];
        if (!cfg) return null;
        return (
          <div key={`${item.channel}-${idx}`} className="flex items-center gap-1.5">
            <span className={`shrink-0 ${cfg.color}`} title={cfg.label}>
              {cfg.icon}
            </span>
            {showLabel && (
              <span className="text-[11px] text-muted-foreground">{cfg.label}</span>
            )}
            <PostStatusBadge
              status={item.status}
              showIcon={false}
              customStatusId={item.customStatusId}
              clientId={clientId}
            />
          </div>
        );
      })}
    </div>
  );
}
