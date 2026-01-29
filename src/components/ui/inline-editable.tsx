import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Loader2, Pencil } from "lucide-react";

export interface InlineEditableOption {
  value: string;
  label: string;
}

interface BaseProps {
  value: string;
  displayValue?: string;
  onSave: (value: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
  placeholder?: string;
}

interface TextProps extends BaseProps {
  type: "text";
}

interface DatetimeProps extends BaseProps {
  type: "datetime";
}

interface SelectProps extends BaseProps {
  type: "select";
  options: InlineEditableOption[];
}

export type InlineEditableProps = TextProps | DatetimeProps | SelectProps;

export function InlineEditable(props: InlineEditableProps) {
  const { value, displayValue, onSave, isLoading, className, placeholder, type } = props;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync value when prop changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === "text") {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  const handleSave = useCallback(async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      // Revert on error
      setEditValue(value);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        setEditValue(value);
        setIsEditing(false);
      }
    },
    [handleSave, value]
  );

  const handleSelectChange = useCallback(
    async (newValue: string) => {
      setEditValue(newValue);
      setIsSaving(true);
      try {
        await onSave(newValue);
        setIsEditing(false);
      } catch (error) {
        setEditValue(value);
        setIsEditing(false);
      } finally {
        setIsSaving(false);
      }
    },
    [onSave, value]
  );

  // Click outside handler
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleSave();
      }
    };

    // Delay to avoid immediate trigger
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing, handleSave]);

  const showLoading = isLoading || isSaving;
  const displayText = displayValue || value || placeholder || "—";

  // View mode - clickable text
  if (!isEditing) {
    return (
      <div
        ref={containerRef}
        onClick={() => !showLoading && setIsEditing(true)}
        className={cn(
          "group relative cursor-pointer rounded-md px-2 py-1.5 -mx-2 transition-colors",
          "hover:bg-muted/50",
          showLoading && "cursor-wait opacity-70",
          className
        )}
      >
        <span className="text-sm">{displayText}</span>
        {showLoading ? (
          <Loader2 className="absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <Pencil className="absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
    );
  }

  // Edit mode - input/select
  if (type === "select") {
    const options = (props as SelectProps).options;
    return (
      <div ref={containerRef} className={cn("-mx-2", className)}>
        <Select value={editValue} onValueChange={handleSelectChange} open>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (type === "datetime") {
    return (
      <div ref={containerRef} className={cn("-mx-2", className)}>
        <Input
          ref={inputRef}
          type="datetime-local"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-9 text-sm"
        />
      </div>
    );
  }

  // Text input
  return (
    <div ref={containerRef} className={cn("-mx-2", className)}>
      <Input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        placeholder={placeholder}
        className="h-9 text-sm"
      />
    </div>
  );
}
