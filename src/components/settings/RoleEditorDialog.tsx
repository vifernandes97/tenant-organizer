import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ALL_FEATURES, ACTION_LABELS, type Action, type Feature } from '@/hooks/usePermissions';
import { useRoles, type Role } from '@/hooks/useRoles';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null; // null = create new
}

export function RoleEditorDialog({ open, onOpenChange, role }: Props) {
  const { upsertRole, isSavingRole, getRolePermissions } = useRoles();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [perms, setPerms] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setName(role?.name || '');
      setDescription(role?.description || '');
      const initial = new Set<string>();
      if (role) {
        for (const p of getRolePermissions(role.id)) initial.add(`${p.feature}:${p.action}`);
      }
      setPerms(initial);
    }
  }, [open, role]);

  const togglePerm = (f: Feature, a: Action) => {
    setPerms((prev) => {
      const next = new Set(prev);
      const k = `${f}:${a}`;
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const permissions: { feature: Feature; action: Action }[] = [];
    for (const k of perms) {
      const [f, a] = k.split(':') as [Feature, Action];
      permissions.push({ feature: f, action: a });
    }
    upsertRole(
      { id: role?.id, name: name.trim(), description: description.trim() || null, permissions },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const isSystem = role?.is_system;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{role ? `Editar papel: ${role.name}` : 'Novo papel'}</DialogTitle>
          <DialogDescription>
            Defina o nome e as permissões que esse papel concede aos membros.
            {isSystem && ' (Você pode editar permissões; este é um papel padrão e não pode ser excluído.)'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="role-name">Nome</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSavingRole}
              placeholder="Ex: Editor de Conteúdo"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-desc">Descrição</Label>
            <Textarea
              id="role-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSavingRole}
            />
          </div>

          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-2 font-medium">Feature</th>
                  {(['view', 'create', 'edit', 'delete'] as Action[]).map((a) => (
                    <th key={a} className="p-2 font-medium text-center">{ACTION_LABELS[a]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_FEATURES.map((feat) => (
                  <tr key={feat.key} className="border-t">
                    <td className="p-2">
                      <div className="font-medium">{feat.label}</div>
                      <div className="text-xs text-muted-foreground">{feat.description}</div>
                    </td>
                    {(['view', 'create', 'edit', 'delete'] as Action[]).map((a) => {
                      const supported = feat.actions.includes(a);
                      if (!supported) return <td key={a} className="p-2 text-center text-muted-foreground">—</td>;
                      const k = `${feat.key}:${a}`;
                      return (
                        <td key={a} className="p-2 text-center">
                          <Checkbox
                            checked={perms.has(k)}
                            onCheckedChange={() => togglePerm(feat.key, a)}
                            disabled={isSavingRole}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSavingRole}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSavingRole || !name.trim()}>
            {isSavingRole ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>) : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
