import { useRef, useState } from 'react';
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
  draggable?: boolean;
  onDragEnd?: (x: number, y: number) => void;
}

export function CommentPin({
  number,
  x,
  y,
  status,
  isActive = false,
  preview,
  onClick,
  draggable = false,
  onDragEnd,
}: CommentPinProps) {
  const isResolved = status === 'resolved';
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggable) return;
    e.preventDefault();
    e.stopPropagation();
    const parent = buttonRef.current?.parentElement as HTMLElement | null;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    movedRef.current = false;
    buttonRef.current?.setPointerCapture(e.pointerId);
    setDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;

    const move = (ev: PointerEvent) => {
      const dx = Math.abs(ev.clientX - startX);
      const dy = Math.abs(ev.clientY - startY);
      if (dx > 3 || dy > 3) movedRef.current = true;
      const nx = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
      const ny = Math.max(0, Math.min(100, ((ev.clientY - rect.top) / rect.height) * 100));
      setDragPos({ x: nx, y: ny });
    };

    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDragging(false);
      if (movedRef.current) {
        const nx = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
        const ny = Math.max(0, Math.min(100, ((ev.clientY - rect.top) / rect.height) * 100));
        onDragEnd?.(nx, ny);
      }
      setDragPos(null);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (movedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      movedRef.current = false;
      return;
    }
    onClick?.();
  };

  const posX = dragPos?.x ?? x;
  const posY = dragPos?.y ?? y;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            ref={buttonRef}
            onPointerDown={handlePointerDown}
            onClick={handleClick}
            className={cn(
              "absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-semibold shadow-lg transition-all duration-200",
              draggable && "cursor-grab active:cursor-grabbing",
              dragging && "cursor-grabbing transition-none",
              isActive
                ? "z-30 h-9 w-9 text-sm scale-110 ring-4 ring-offset-2 ring-offset-background shadow-[0_0_0_8px_hsl(var(--primary)/0.18),0_10px_28px_-4px_hsl(var(--primary)/0.7)]"
                : "z-10 h-6 w-6 text-xs",
              isResolved
                ? cn("bg-green-500 text-white hover:bg-green-600", isActive && "ring-green-500/70")
                : cn("bg-primary text-primary-foreground hover:bg-primary/90", isActive && "ring-primary/70"),
              !isResolved && !isActive && !dragging && "animate-pulse"
            )}
            style={{
              left: `${posX}%`,
              top: `${posY}%`,
            }}
          >
            {number}
          </button>
        </TooltipTrigger>
        {preview && !dragging && (
          <TooltipContent side="top" className="max-w-xs">
            <p className="line-clamp-2 text-sm">{preview}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
