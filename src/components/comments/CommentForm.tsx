import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, X } from 'lucide-react';

interface CommentFormProps {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  isLoading?: boolean;
  compact?: boolean;
}

export function CommentForm({ 
  onSubmit, 
  onCancel, 
  placeholder = "Digite seu comentário...",
  autoFocus = false,
  isLoading = false,
  compact = false,
}: CommentFormProps) {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content.trim());
      setContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (content.trim()) {
        onSubmit(content.trim());
        setContent('');
      }
    }
    if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={compact ? 2 : 3}
        className="resize-none"
        disabled={isLoading}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          ⌘+Enter para enviar
        </p>
        <div className="flex gap-2">
          {onCancel && (
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={onCancel}
              disabled={isLoading}
            >
              <X className="mr-1 h-3 w-3" />
              Cancelar
            </Button>
          )}
          <Button 
            type="submit" 
            size="sm" 
            disabled={!content.trim() || isLoading}
          >
            <Send className="mr-1 h-3 w-3" />
            Enviar
          </Button>
        </div>
      </div>
    </form>
  );
}
