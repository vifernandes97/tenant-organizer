import { useState, useEffect } from 'react';
import { useUserClientAccess } from '@/hooks/useUserClientAccess';
import { ClientAccessSelector } from './ClientAccessSelector';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Settings2 } from 'lucide-react';

interface MemberPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    full_name: string | null;
  };
}

export function MemberPermissionsDialog({
  open,
  onOpenChange,
  member,
}: MemberPermissionsDialogProps) {
  const { userAccess, accessibleClientIds, isLoading, updateAccess, isUpdating } = useUserClientAccess(member.id);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  // Sincronizar com os dados carregados (apenas quando o dado do servidor muda, não a cada render)
  useEffect(() => {
    if (open && !isLoading) {
      setSelectedClientIds(userAccess.map(a => a.client_id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isLoading, userAccess]);

  const handleSave = () => {
    updateAccess(
      { userId: member.id, clientIds: selectedClientIds },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Permissões de {member.full_name || 'Membro'}
          </DialogTitle>
          <DialogDescription>
            Selecione os clientes que este membro pode acessar.
            Ele poderá ver e editar posts dos clientes selecionados.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ClientAccessSelector
              selectedClientIds={selectedClientIds}
              onSelectionChange={setSelectedClientIds}
              accessMode="selected"
              onAccessModeChange={() => {}}
              showModeSelector={false}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isUpdating || isLoading}>
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
