import { useState, KeyboardEvent } from 'react';
import { Star, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SeoKeywordsInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function SeoKeywordsInput({ value, onChange, isLoading, disabled }: SeoKeywordsInputProps) {
  const [draft, setDraft] = useState('');
  const keywords = Array.isArray(value) ? value : [];

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (keywords.some((k) => k.toLowerCase() === trimmed.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...keywords, trimmed]);
    setDraft('');
  };

  const remove = (idx: number) => {
    const next = keywords.filter((_, i) => i !== idx);
    onChange(next);
  };

  const setPrimary = (idx: number) => {
    if (idx === 0) return;
    const next = [keywords[idx], ...keywords.filter((_, i) => i !== idx)];
    onChange(next);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !draft && keywords.length) {
      remove(keywords.length - 1);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {keywords.map((kw, idx) => {
          const isPrimary = idx === 0;
          return (
            <span
              key={`${kw}-${idx}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                isPrimary
                  ? 'bg-green-500 text-white'
                  : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
              )}
            >
              <button
                type="button"
                onClick={() => remove(idx)}
                disabled={disabled}
                className="opacity-70 hover:opacity-100"
                aria-label="Remover"
              >
                <X className="h-3 w-3" />
              </button>
              <span className="max-w-[180px] truncate">{kw}</span>
              <button
                type="button"
                onClick={() => setPrimary(idx)}
                disabled={disabled || isPrimary}
                className={cn(
                  'transition-opacity',
                  isPrimary ? 'opacity-100' : 'opacity-50 hover:opacity-100'
                )}
                aria-label={isPrimary ? 'Palavra-chave principal' : 'Definir como principal'}
                title={isPrimary ? 'Palavra-chave principal' : 'Definir como principal'}
              >
                <Star className={cn('h-3.5 w-3.5', isPrimary && 'fill-current')} />
              </button>
            </span>
          );
        })}
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={keywords.length ? 'Adicionar outra palavra-chave...' : 'Digite e pressione Enter'}
        disabled={disabled}
        className="h-8 text-sm"
      />
      {keywords.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          A estrela indica a palavra-chave principal. Clique na estrela de outra para alterná-la.
        </p>
      )}
    </div>
  );
}
