import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMembers, TeamMember } from '@/hooks/useTeamMembers';
import { useAllClientAccess } from '@/hooks/useUserClientAccess';
import { MemberPermissionsDialog } from './MemberPermissionsDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface TeamMemberRowProps {
  member: TeamMember;
  isCurrentUser: boolean;
  canRemove: boolean;
  canEditPermissions: boolean;
  onRemove: () => void;
  onEditPermissions: () => void;
  isRemoving: boolean;
  clientCount: number;
}

function TeamMemberRow({ 
  member, 
  isCurrentUser, 
  canRemove, 
  canEditPermissions,
  onRemove, 
  onEditPermissions,
  isRemoving,
  clientCount,
}: TeamMemberRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.avatar_url || undefined} alt={member.full_name || 'Usuário'} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(member.full_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{member.full_name || 'Sem nome'}</span>
            {isCurrentUser && (
              <span className="text-xs text-muted-foreground">(você)</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
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

      <div className="flex items-center gap-1">
        {canEditPermissions && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onEditPermissions}
            title="Editar permissões"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        )}

        {canRemove && !isCurrentUser && (
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
                  onClick={onRemove}
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
}

export function TeamList() {
  const { user } = useAuth();
  const { members, isLoading, isOwner, removeMember, isRemoving } = useTeamMembers();
  const { getClientCountForUser } = useAllClientAccess();
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
            <p className="text-muted-foreground text-center py-4">
              Nenhum membro encontrado
            </p>
          ) : (
            <div className="divide-y">
              {members.map(member => (
                <TeamMemberRow
                  key={member.id}
                  member={member}
                  isCurrentUser={member.id === user?.id}
                  canRemove={isOwner && member.role !== 'owner'}
                  canEditPermissions={isOwner && member.role === 'member' && member.id !== user?.id}
                  onRemove={() => removeMember(member.id)}
                  onEditPermissions={() => setEditingMember(member)}
                  isRemoving={isRemoving}
                  clientCount={getClientCountForUser(member.id)}
                />
              ))}
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
