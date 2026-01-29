import { useInvitations, Invitation } from '@/hooks/useInvitations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Copy, X, Mail, Clock, Crown, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InviteRowProps {
  invitation: Invitation;
  onCopyLink: () => void;
  onRevoke: () => void;
  isRevoking: boolean;
}

function InviteRow({ invitation, onCopyLink, onRevoke, isRevoking }: InviteRowProps) {
  const expiresAt = new Date(invitation.expires_at);
  const isExpired = expiresAt < new Date();

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <Mail className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{invitation.email}</span>
            <Badge variant={invitation.role === 'owner' ? 'default' : 'secondary'}>
              {invitation.role === 'owner' ? (
                <><Crown className="h-3 w-3 mr-1" /> Proprietário</>
              ) : (
                <><User className="h-3 w-3 mr-1" /> Membro</>
              )}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            {isExpired ? (
              <span className="text-destructive">Expirado</span>
            ) : (
              <span>
                Expira {formatDistanceToNow(expiresAt, { addSuffix: true, locale: ptBR })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {!isExpired && (
          <Button variant="ghost" size="icon" onClick={onCopyLink} title="Copiar link">
            <Copy className="h-4 w-4" />
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              title="Revogar convite"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revogar convite</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja revogar o convite para <strong>{invitation.email}</strong>?
                O link de convite deixará de funcionar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={onRevoke}
                disabled={isRevoking}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isRevoking ? 'Revogando...' : 'Revogar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export function PendingInvites() {
  const { pendingInvitations, isLoading, revokeInvitation, isRevoking, copyInviteLink } = useInvitations();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Convites Pendentes</CardTitle>
          <CardDescription>Convites aguardando aceitação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingInvitations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convites Pendentes</CardTitle>
        <CardDescription>
          {pendingInvitations.length} {pendingInvitations.length === 1 ? 'convite aguardando' : 'convites aguardando'} aceitação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {pendingInvitations.map(invitation => (
            <InviteRow
              key={invitation.id}
              invitation={invitation}
              onCopyLink={() => copyInviteLink(invitation.token)}
              onRevoke={() => revokeInvitation(invitation.id)}
              isRevoking={isRevoking}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
