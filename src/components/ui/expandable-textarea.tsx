import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "./textarea";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./dialog";
import { RichTextEditor, extractPlainText } from "./rich-text-editor";

export interface ExpandableTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
  maxLength?: number;
  dialogTitle?: string;
}

const ExpandableTextarea = React.forwardRef<HTMLTextAreaElement, ExpandableTextareaProps>(
  ({ className, value, onChange, maxLength = 10000, placeholder, dialogTitle = "Editor de Legenda", ...props }, ref) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [tempValue, setTempValue] = useState(value || "");

    // Sync tempValue when opening fullscreen
    useEffect(() => {
      if (isFullscreen) {
        setTempValue(value || "");
      }
    }, [isFullscreen, value]);

    const handleApply = () => {
      onChange?.(tempValue);
      setIsFullscreen(false);
    };

    const handleCancel = () => {
      setTempValue(value || "");
      setIsFullscreen(false);
    };

    // Extract plain text for the compact view
    const displayText = useMemo(() => {
      if (!value) return "";
      // Check if value contains HTML tags
      if (/<[^>]+>/.test(value)) {
        return extractPlainText(value);
      }
      return value;
    }, [value]);

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e.target.value);
    };

    const currentLength = displayText.length;

    return (
      <div className="relative">
        {/* Textarea with expand icon - shows plain text preview */}
        <Textarea
          ref={ref}
          value={displayText}
          onChange={handleTextareaChange}
          placeholder={placeholder}
          maxLength={maxLength}
          className={cn("pr-10", className)}
          {...props}
        />

        {/* Expand button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsFullscreen(true)}
          className="absolute right-2 top-2 h-7 w-7 opacity-50 hover:opacity-100 transition-opacity"
          title="Expandir para editor rico"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>

        {/* Fullscreen Dialog with Rich Text Editor */}
        <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
          <DialogContent className="flex h-[90vh] max-w-4xl flex-col">
            <DialogHeader>
              <DialogTitle>{dialogTitle}</DialogTitle>
            </DialogHeader>

            <div className="flex flex-1 flex-col min-h-0 overflow-auto">
              <RichTextEditor
                value={tempValue}
                onChange={setTempValue}
                placeholder={placeholder}
                maxLength={maxLength}
                className="flex-1"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleApply}>
                Aplicar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);

ExpandableTextarea.displayName = "ExpandableTextarea";

export { ExpandableTextarea };
