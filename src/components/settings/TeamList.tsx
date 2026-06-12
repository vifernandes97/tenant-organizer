import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMembers, TeamMember } from '@/hooks/useTeamMembers';
import { useAllClientAccess } from '@/hooks/useUserClientAccess';
import { useRoles, useUpdateMemberRole } from '@/hooks/useRoles';
import { MemberPermissionsDialog } from './MemberPermissionsDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { UserMinus, Crown, User, Settings2 } from 'lucide-react';

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function TeamList() {
  const { user } = useAuth();
  const { members, isLoading, isOwner, removeMember, isRemoving } = useTeamMembers();
  const { getClientCountForUser } = useAllClientAccess();
  const { roles } = useRoles();
  const updateMemberRole = useUpdateMemberRole();
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
          <CardDescription>Membros da sua organização</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? 'membro' : 'membros'} na organização
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nenhum membro encontrado</p>
          ) : (
            <div className="divide-y">
              {members.map(member => {
                const isCurrentUser = member.id === user?.id;
                const canEditPermissions = isOwner && member.role === 'member' && !isCurrentUser;
                const canRemove = isOwner && member.role !== 'owner' && !isCurrentUser;
                const clientCount = getClientCountForUser(member.id);

                return (
                  <div key={member.id} className="flex items-center justify-between py-3 gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar_url || undefined} alt={member.full_name || 'Usuário'} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{member.full_name || 'Sem nome'}</span>
                          {isCurrentUser && (
                            <span className="text-xs text-muted-foreground">(você)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                            {member.role === 'owner' ? (
                              <><Crown className="h-3 w-3 mr-1" /> Proprietário</>
                            ) : (
                              <><User className="h-3 w-3 mr-1" /> Membro</>
                            )}
                          </Badge>
                          {member.role === 'member' && (
                            <span className="text-xs text-muted-foreground">
                              • {clientCount} {clientCount === 1 ? 'cliente' : 'clientes'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {member.role === 'member' && isOwner && (
                      <div className="w-48">
                        <Select
                          value={member.custom_role_id || ''}
                          onValueChange={(val) =>
                            updateMemberRole.mutate({ userId: member.id, customRoleId: val || null })
                          }
                          disabled={updateMemberRole.isPending}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Sem papel" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((r) => (
                              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      {canEditPermissions && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingMember(member)}
                          title="Acesso a clientes"
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      )}

                      {canRemove && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover membro</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover <strong>{member.full_name}</strong> da equipe?
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeMember(member.id)}
                                disabled={isRemoving}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {isRemoving ? 'Removendo...' : 'Remover'}
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

      {editingMember && (
        <MemberPermissionsDialog
          open={!!editingMember}
          onOpenChange={(open) => !open && setEditingMember(null)}
          member={editingMember}
        />
      )}
    </>
  );
}

