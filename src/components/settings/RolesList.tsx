import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useRoles, type Role } from '@/hooks/useRoles';
import { RoleEditorDialog } from './RoleEditorDialog';
import { Pencil, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { ACTION_LABELS, ALL_FEATURES } from '@/hooks/usePermissions';

export function RolesList() {
  const { roles, getRolePermissions, isLoading, deleteRole, isDeletingRole } = useRoles();
  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Papéis e permissões
            </CardTitle>
            <CardDescription>
              Defina papéis reutilizáveis com permissões granulares por funcionalidade.
              Atribua-os aos membros existentes ou aos novos convites.
            </CardDescription>
          </div>
          <Button onClick={() => setCreating(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo papel
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm py-4">Carregando...</p>
          ) : roles.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Nenhum papel cadastrado</p>
          ) : (
            <div className="divide-y">
              {roles.map((role) => {
                const rolePerms = getRolePermissions(role.id);
                const summary = ALL_FEATURES.map((f) => {
                  const acts = rolePerms.filter((p) => p.feature === f.key).map((p) => ACTION_LABELS[p.action]);
                  if (!acts.length) return null;
                  return `${f.label}: ${acts.join(', ')}`;
                }).filter(Boolean);
                return (
                  <div key={role.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{role.name}</span>
                        {role.is_system && <Badge variant="secondary">Padrão</Badge>}
                      </div>
                      {role.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {summary.length ? summary.join(' • ') : 'Sem permissões'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(role)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!role.is_system && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Excluir">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir papel</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza? Membros que usam este papel ficarão sem permissões até receberem outro.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteRole(role.id)}
                                disabled={isDeletingRole}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <RoleEditorDialog
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) { setCreating(false); setEditing(null); }
        }}
        role={editing}
      />
    </>
  );
}
