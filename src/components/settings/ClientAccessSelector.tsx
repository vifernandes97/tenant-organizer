import { useClients } from '@/hooks/useClients';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ClientAccessSelectorProps {
  selectedClientIds: string[];
  onSelectionChange: (clientIds: string[]) => void;
  accessMode: 'all' | 'selected';
  onAccessModeChange: (mode: 'all' | 'selected') => void;
  showModeSelector?: boolean;
}

export function ClientAccessSelector({
  selectedClientIds,
  onSelectionChange,
  accessMode,
  onAccessModeChange,
  showModeSelector = true,
}: ClientAccessSelectorProps) {
  const { data: clients = [], isLoading } = useClients();

  const handleClientToggle = (clientId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedClientIds, clientId]);
    } else {
      onSelectionChange(selectedClientIds.filter(id => id !== clientId));
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(clients.map(c => c.id));
  };

  const handleSelectNone = () => {
    onSelectionChange([]);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nenhum cliente cadastrado ainda.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {showModeSelector && (
        <RadioGroup
          value={accessMode}
          onValueChange={(value) => onAccessModeChange(value as 'all' | 'selected')}
          className="space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="access-all" />
            <Label htmlFor="access-all" className="font-normal cursor-pointer">
              Acesso a todos os clientes (Proprietário)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="selected" id="access-selected" />
            <Label htmlFor="access-selected" className="font-normal cursor-pointer">
              Clientes selecionados
            </Label>
          </div>
        </RadioGroup>
      )}

      {(accessMode === 'selected' || !showModeSelector) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedClientIds.length} de {clients.length} selecionados
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-primary hover:underline"
              >
                Selecionar todos
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                type="button"
                onClick={handleSelectNone}
                className="text-xs text-primary hover:underline"
              >
                Limpar
              </button>
            </div>
          </div>

          <ScrollArea className="h-[200px] rounded-md border p-3">
            <div className="space-y-3">
              {clients.map(client => (
                <div key={client.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={`client-${client.id}`}
                    checked={selectedClientIds.includes(client.id)}
                    onCheckedChange={(checked) =>
                      handleClientToggle(client.id, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`client-${client.id}`}
                    className="font-normal cursor-pointer flex-1"
                  >
                    {client.name}
                    {client.status === 'paused' && (
                      <span className="text-muted-foreground text-xs ml-2">(pausado)</span>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
