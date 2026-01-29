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
              "absolute z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-semibold shadow-lg transition-all duration-200",
              isResolved
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
              isActive && "ring-2 ring-offset-2 ring-offset-background scale-110",
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
