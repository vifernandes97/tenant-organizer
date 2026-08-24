import { useState, useEffect } from 'react';
import { useInvitations } from '@/hooks/useInvitations';
import { useRoles } from '@/hooks/useRoles';
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
import { UserPlus, Loader2, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { usePlan } from '@/hooks/usePlan';

interface InviteDialogProps {
  trigger?: React.ReactNode;
}

export function InviteDialog({ trigger }: InviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'owner'>('member');
  const [customRoleId, setCustomRoleId] = useState<string>('');
  const [accessMode, setAccessMode] = useState<'all' | 'selected'>('selected');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const { createInvitation, isCreating } = useInvitations();
  const { roles } = useRoles();
  const { canInviteMember, usage, isLocked, isLoading: isPlanLoading } = usePlan();
  const blocked = !isPlanLoading && !canInviteMember;


  // Default to "Editor" role when available
  useEffect(() => {
    if (!customRoleId && roles.length) {
      const editor = roles.find((r) => r.name === 'Editor') || roles[0];
      setCustomRoleId(editor.id);
    }
  }, [roles, customRoleId]);

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

    if (role === 'member' && !customRoleId) {
      toast.error('Selecione um papel para o membro');
      return;
    }

    if (role === 'member' && accessMode === 'selected' && selectedClientIds.length === 0) {
      toast.error('Selecione pelo menos um cliente para o membro acessar');
      return;
    }

    const clientIds = role === 'owner' || accessMode === 'all' ? null : selectedClientIds;

    createInvitation(
      { email, role, clientIds, customRoleId: role === 'owner' ? null : customRoleId },
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
    if (newRole === 'owner') {
      setAccessMode('all');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button disabled={blocked}>
                    {!blocked ? <UserPlus className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                    Convidar membro
                  </Button>
                </span>
              </TooltipTrigger>
              {blocked && (
                <TooltipContent>
                  {isLocked
                    ? 'Organização em modo somente leitura'
                    : `Limite de membros atingido (${usage.members.used}/${usage.members.limit}). Faça upgrade ou cancele um convite pendente.`}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
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
              <Label htmlFor="role">Tipo de acesso</Label>
              <Select value={role} onValueChange={handleRoleChange} disabled={isCreating}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="owner">Proprietário</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {role === 'owner'
                  ? 'Proprietários têm acesso total a tudo.'
                  : 'Membros têm permissões definidas pelo papel atribuído.'}
              </p>
            </div>

            {role === 'member' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="custom-role">Papel</Label>
                  <Select value={customRoleId} onValueChange={setCustomRoleId} disabled={isCreating}>
                    <SelectTrigger id="custom-role">
                      <SelectValue placeholder="Selecione o papel" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}{r.is_system ? ' (padrão)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Defina e gerencie papéis na aba "Papéis e permissões".
                  </p>
                </div>

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
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isCreating}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando...</>) : 'Criar convite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

