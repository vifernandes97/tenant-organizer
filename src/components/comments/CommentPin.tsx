import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { CommentStatus } from '@/hooks/useComments';

interface CommentPinProps {
  number: number;
  x: number;
  y: number;
  status: CommentStatus;
  isActive?: boolean;
  preview?: string;
  onClick?: () => void;
}

export function CommentPin({ 
  number, 
  x, 
  y, 
  status, 
  isActive = false, 
  preview,
  onClick 
}: CommentPinProps) {
  const isResolved = status === 'resolved';

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-semibold shadow-lg transition-all duration-200",
              isActive
                ? "z-30 h-9 w-9 text-sm scale-110 ring-4 ring-offset-2 ring-offset-background shadow-[0_0_0_8px_hsl(var(--primary)/0.18),0_10px_28px_-4px_hsl(var(--primary)/0.7)]"
                : "z-10 h-6 w-6 text-xs",
              isResolved
                ? cn("bg-green-500 text-white hover:bg-green-600", isActive && "ring-green-500/70")
                : cn("bg-primary text-primary-foreground hover:bg-primary/90", isActive && "ring-primary/70"),
              !isResolved && !isActive && "animate-pulse"
            )}
            style={{
              left: `${x}%`,
              top: `${y}%`,
            }}
          >
            {number}
          </button>
        </TooltipTrigger>
        {preview && (
          <TooltipContent side="top" className="max-w-xs">
            <p className="line-clamp-2 text-sm">{preview}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
