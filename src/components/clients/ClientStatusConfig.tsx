import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { DEFAULT_POST_STATUSES, type ClientPostStatusInsert } from '@/hooks/useClientPostStatuses';

type StatusItem = Omit<ClientPostStatusInsert, 'client_id' | 'tenant_id' | 'channel'>;

const COLOR_OPTIONS = [
  '#6b7280', // gray
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#06b6d4', // cyan
  '#14b8a6', // teal
];

interface ClientStatusConfigProps {
  statuses: StatusItem[];
  onChange: (statuses: StatusItem[]) => void;
}

export function ClientStatusConfig({ statuses, onChange }: ClientStatusConfigProps) {
  const [newName, setNewName] = useState('');

  const addStatus = () => {
    if (!newName.trim()) return;
    const slug = newName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (statuses.some(s => s.slug === slug)) return;

    onChange([
      ...statuses,
      {
        name: newName.trim(),
        slug,
        color: COLOR_OPTIONS[statuses.length % COLOR_OPTIONS.length],
        icon: 'circle',
        display_order: statuses.length,
        is_final: false,
      },
    ]);
    setNewName('');
  };

  const removeStatus = (index: number) => {
    onChange(statuses.filter((_, i) => i !== index));
  };

  const updateStatus = (index: number, updates: Partial<StatusItem>) => {
    onChange(statuses.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const moveStatus = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= statuses.length) return;
    const updated = [...statuses];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onChange(updated.map((s, i) => ({ ...s, display_order: i })));
  };

  const loadDefaults = () => {
    onChange([...DEFAULT_POST_STATUSES]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Status personalizados</Label>
        {statuses.length === 0 && (
          <Button type="button" variant="outline" size="sm" onClick={loadDefaults}>
            Carregar padrão
          </Button>
        )}
      </div>

      {statuses.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum status configurado. Os status padrão do sistema serão usados.
        </p>
      )}

      <div className="space-y-2">
        {statuses.map((status, index) => (
          <div
            key={index}
            className="flex items-center gap-2 rounded-lg border p-2"
          >
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                onClick={() => moveStatus(index, index - 1)}
                disabled={index === 0}
              >
                <GripVertical className="h-4 w-4" />
              </button>
            </div>

            {/* Color picker */}
            <div className="relative">
              <input
                type="color"
                value={status.color}
                onChange={(e) => updateStatus(index, { color: e.target.value })}
                className="h-8 w-8 cursor-pointer rounded border-0 p-0"
                title="Cor do status"
              />
            </div>

            {/* Name */}
            <Input
              value={status.name}
              onChange={(e) => updateStatus(index, { name: e.target.value })}
              className="flex-1 h-8"
              placeholder="Nome do status"
            />

            {/* Preview badge */}
            <Badge
              className="shrink-0 text-white"
              style={{ backgroundColor: status.color }}
            >
              {status.name}
            </Badge>

            {/* Is final */}
            <div className="flex items-center gap-1">
              <Checkbox
                checked={status.is_final}
                onCheckedChange={(checked) => updateStatus(index, { is_final: !!checked })}
                id={`final-${index}`}
              />
              <label htmlFor={`final-${index}`} className="text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
                Final
              </label>
            </div>

            {/* Delete */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
              onClick={() => removeStatus(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add new status */}
      <div className="flex gap-2">
        <Input
          placeholder="Nome do novo status..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addStatus();
            }
          }}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={addStatus} disabled={!newName.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
