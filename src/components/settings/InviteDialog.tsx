import { useState } from 'react';
import { useInvitations } from '@/hooks/useInvitations';
import { ClientAccessSelector } from './ClientAccessSelector';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface InviteDialogProps {
  trigger?: React.ReactNode;
}

export function InviteDialog({ trigger }: InviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'owner'>('member');
  const [accessMode, setAccessMode] = useState<'all' | 'selected'>('selected');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const { createInvitation, isCreating } = useInvitations();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Digite o email do convidado');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Email inválido');
      return;
    }

    // Para membros com acesso selecionado, verificar se selecionou algum cliente
    if (role === 'member' && accessMode === 'selected' && selectedClientIds.length === 0) {
      toast.error('Selecione pelo menos um cliente para o membro acessar');
      return;
    }

    // Determinar client_ids: null para owners ou membros com acesso total
    const clientIds = role === 'owner' || accessMode === 'all' 
      ? null 
      : selectedClientIds;

    createInvitation(
      { email, role, clientIds },
      {
        onSuccess: () => {
          setOpen(false);
          setEmail('');
          setRole('member');
          setAccessMode('selected');
          setSelectedClientIds([]);
        },
      }
    );
  };

  const handleRoleChange = (newRole: 'member' | 'owner') => {
    setRole(newRole);
    // Owners sempre têm acesso total
    if (newRole === 'owner') {
      setAccessMode('all');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Convidar membro
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Convidar novo membro</DialogTitle>
            <DialogDescription>
              Envie um convite para adicionar alguém à sua organização.
              O link será válido por 7 dias.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Papel</Label>
              <Select
                value={role}
                onValueChange={handleRoleChange}
                disabled={isCreating}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="owner">Proprietário</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {role === 'owner' 
                  ? 'Proprietários têm acesso total a todos os clientes.'
                  : 'Membros podem ter acesso restrito a clientes específicos.'}
              </p>
            </div>

            {role === 'member' && (
              <div className="space-y-2">
                <Label>Acesso a clientes</Label>
                <ClientAccessSelector
                  selectedClientIds={selectedClientIds}
                  onSelectionChange={setSelectedClientIds}
                  accessMode={accessMode}
                  onAccessModeChange={setAccessMode}
                  showModeSelector={false}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar convite'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
