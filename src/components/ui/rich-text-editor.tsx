import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { EditorToolbar } from "./editor-toolbar";
import { cn } from "@/lib/utils";

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

export interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  maxHeight?: string;
}

export function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Escreva sua legenda...",
  maxLength = 5000,
  className,
  maxHeight,
}: RichTextEditorProps) {
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
          "min-h-[200px] w-full rounded-b-md border border-input bg-background px-3 py-2",
          "text-sm ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50"
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // Sync external value changes — only when editor is not focused, to avoid
  // resetting the user's caret/content while they're typing.
  React.useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  const characterCount = editor?.storage.characterCount.characters() ?? 0;

  return (
    <div className={cn("flex flex-col", className)}>
      <EditorToolbar editor={editor} />
      <div 
        className="overflow-y-auto"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <EditorContent editor={editor} />
      </div>
      <div className="mt-2 text-right text-sm text-muted-foreground">
        {characterCount}/{maxLength} caracteres
      </div>
    </div>
  );
}

// Utility function to extract plain text from HTML
// Re-exported from textUtils for backwards compatibility
export { extractPlainText } from '@/lib/textUtils';
