import { Badge } from "@/components/ui/badge";
import { Instagram, Linkedin, Facebook, Twitter, Youtube, Globe } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type SocialChannel = Database["public"]["Enums"]["social_channel"];

interface ChannelBadgesProps {
  channels: SocialChannel[] | null;
  size?: "sm" | "md";
  iconOnly?: boolean;
}

const channelConfig: Record<SocialChannel, { label: string; icon: React.ReactNode; className: string }> = {
  instagram_feed: {
    label: "Instagram Feed",
    icon: <Instagram className="h-3 w-3" />,
    className: "bg-pink-500/10 text-pink-600 border-pink-500/20 hover:bg-pink-500/20",
  },
  instagram_reels: {
    label: "Instagram Reels",
    icon: <Instagram className="h-3 w-3" />,
    className: "bg-pink-500/10 text-pink-600 border-pink-500/20 hover:bg-pink-500/20",
  },
  instagram_story: {
    label: "Instagram Story",
    icon: <Instagram className="h-3 w-3" />,
    className: "bg-pink-500/10 text-pink-600 border-pink-500/20 hover:bg-pink-500/20",
  },
  tiktok: {
    label: "TikTok",
    icon: (
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
      </svg>
    ),
    className: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 hover:bg-cyan-500/20",
  },
  linkedin: {
    label: "LinkedIn",
    icon: <Linkedin className="h-3 w-3" />,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20",
  },
  facebook: {
    label: "Facebook",
    icon: <Facebook className="h-3 w-3" />,
    className: "bg-blue-600/10 text-blue-700 border-blue-600/20 hover:bg-blue-600/20",
  },
  twitter: {
    label: "Twitter",
    icon: <Twitter className="h-3 w-3" />,
    className: "bg-sky-500/10 text-sky-600 border-sky-500/20 hover:bg-sky-500/20",
  },
  youtube: {
    label: "YouTube",
    icon: <Youtube className="h-3 w-3" />,
    className: "bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20",
  },
  wordpress: {
    label: "WordPress",
    icon: <Globe className="h-3 w-3" />,
    className: "bg-slate-500/10 text-slate-600 border-slate-500/20 hover:bg-slate-500/20",
  },
};

export function ChannelBadges({ channels, size = "sm", iconOnly = false }: ChannelBadgesProps) {
  if (!channels || channels.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  if (iconOnly) {
    return (
      <div className="flex gap-1">
        {channels.map((channel) => {
          const config = channelConfig[channel];
          if (!config) return null;
          return (
            <span key={channel} className={config.className.split(' ').find(c => c.startsWith('text-'))}>
              {config.icon}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {channels.map((channel) => {
        const config = channelConfig[channel];
        if (!config) return null;

        return (
          <Badge
            key={channel}
            variant="outline"
            className={`${config.className} ${size === "sm" ? "text-xs px-1.5 py-0" : "text-sm px-2 py-0.5"}`}
          >
            <span className="mr-1">{config.icon}</span>
            {config.label}
          </Badge>
        );
      })}
    </div>
  );
}
