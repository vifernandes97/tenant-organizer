import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import DOMPurify from "dompurify";
import { EditorToolbar } from "./editor-toolbar";
import { cn } from "@/lib/utils";
import { Loader2, Pencil } from "lucide-react";

// Configure DOMPurify to only allow safe TipTap formatting tags
const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'span'];
const ALLOWED_ATTR = ['style'];
const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, { 
    ALLOWED_TAGS, 
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
};

// Custom extension for font size
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => {
          if (!attributes.fontSize) {
            return {};
          }
          return {
            style: `font-size: ${attributes.fontSize}`,
          };
        },
      },
    };
  },
});

interface InlineRichTextEditorProps {
  value: string;
  onSave: (html: string) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function InlineRichTextEditor({
  value = "",
  onSave,
  isLoading,
  placeholder = "Clique para adicionar legenda...",
  maxLength = 5000,
  className,
}: InlineRichTextEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [originalValue, setOriginalValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      FontSize,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      CharacterCount.configure({
        limit: maxLength,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none",
          "min-h-[100px] w-full rounded-b-md border border-input bg-background px-3 py-2",
          "text-sm ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        ),
      },
    },
  });

  // Sync external value changes — only when editor is not focused/editing,
  // to avoid resetting the user's caret/content while they're typing.
  useEffect(() => {
    if (!editor) return;
    if (isEditing || editor.isFocused) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value, isEditing]);

  const handleSave = useCallback(async () => {
    if (!editor) return;
    
    const newValue = editor.getHTML();
    if (newValue === originalValue) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(newValue);
      setOriginalValue(newValue);
      setIsEditing(false);
    } catch (error) {
      // Revert on error
      editor.commands.setContent(originalValue);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }, [editor, originalValue, onSave]);

  const handleStartEditing = useCallback(() => {
    if (!isSaving && !isLoading) {
      setOriginalValue(value);
      setIsEditing(true);
      // Focus editor after a short delay
      setTimeout(() => {
        editor?.commands.focus("end");
      }, 50);
    }
  }, [isSaving, isLoading, value, editor]);

  const handleCancel = useCallback(() => {
    editor?.commands.setContent(originalValue);
    setIsEditing(false);
  }, [editor, originalValue]);

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
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing, handleSave]);

  const showLoading = isLoading || isSaving;
  const characterCount = editor?.storage.characterCount.characters() ?? 0;

  // Extract plain text for preview
  const extractPlainText = (html: string): string => {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  // View mode
  if (!isEditing) {
    return (
      <div
        ref={containerRef}
        onClick={handleStartEditing}
        className={cn(
          "group relative cursor-pointer rounded-lg transition-colors",
          "hover:ring-2 hover:ring-muted hover:ring-offset-2",
          showLoading && "cursor-wait opacity-70",
          className
        )}
      >
        {value ? (
          <div 
            className="prose prose-sm dark:prose-invert max-h-[200px] max-w-none overflow-y-auto rounded-lg bg-muted/50 p-4"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
          />
        ) : (
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm italic text-muted-foreground">{placeholder}</p>
          </div>
        )}
        {showLoading ? (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Pencil className="absolute right-3 top-3 h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div ref={containerRef} className={cn("flex flex-col", className)}>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="rounded-md bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          {characterCount}/{maxLength} caracteres
        </span>
      </div>
    </div>
  );
}
