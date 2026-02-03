import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAcceptInvitation } from '@/hooks/useInvitations';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Sparkles, LogIn, UserPlus } from 'lucide-react';

type InviteStatus = 'loading' | 'valid' | 'invalid' | 'accepting' | 'accepted' | 'error';

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading, profile } = useAuth();
  const { validateToken, acceptInvitation, isAccepting } = useAcceptInvitation();

  const [status, setStatus] = useState<InviteStatus>('loading');
  const [tenantName, setTenantName] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const checkInvitation = async () => {
      if (!token) {
        setStatus('invalid');
        setErrorMessage('Token de convite não encontrado');
        return;
      }

      const result = await validateToken(token);

      if (!result.valid || !result.invitation) {
        setStatus('invalid');
        setErrorMessage('Este convite é inválido ou já expirou');
        return;
      }

      setTenantName(result.tenantName || 'Organização');
      setInviteEmail(result.invitation.email);
      setStatus('valid');
    };

    if (!authLoading) {
      checkInvitation();
    }
  }, [token, authLoading, validateToken]);

  const handleAccept = async () => {
    if (!token || !user) return;

    // Verificar se o email do usuário corresponde ao convite
    if (user.email?.toLowerCase() !== inviteEmail.toLowerCase()) {
      setStatus('error');
      setErrorMessage(
        `Este convite foi enviado para ${inviteEmail}. Você está logado como ${user.email}. Por favor, faça logout e crie uma conta com o email correto.`
      );
      return;
    }

    setStatus('accepting');

    acceptInvitation(
      { token, userId: user.id },
      {
        onSuccess: () => {
          setStatus('accepted');
          setTimeout(() => navigate('/dashboard'), 2000);
        },
        onError: (error) => {
          setStatus('error');
          setErrorMessage(error.message || 'Erro ao aceitar convite');
        },
      }
    );
  };

  // Se usuário já tem um tenant, redirecionar
  useEffect(() => {
    if (profile?.tenant_id && status !== 'accepting' && status !== 'accepted') {
      navigate('/dashboard');
    }
  }, [profile, status, navigate]);

  if (authLoading || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Validando convite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'invalid' || status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">Marketing Hub</span>
        </div>

        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Convite Inválido</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <Link to="/login">Ir para Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (status === 'accepted') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">Marketing Hub</span>
        </div>

        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Bem-vindo à equipe!</CardTitle>
            <CardDescription>
              Você agora faz parte de <strong>{tenantName}</strong>.
              Redirecionando para o dashboard...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // status === 'valid' - mostrar opções
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <Sparkles className="h-7 w-7 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold">Marketing Hub</span>
      </div>

      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <CardTitle>Você foi convidado!</CardTitle>
          <CardDescription>
            Você recebeu um convite para fazer parte de{' '}
            <strong>{tenantName}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Você está logado como <strong>{user.email}</strong>
              </p>
              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={isAccepting || status === 'accepting'}
              >
                {isAccepting || status === 'accepting' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aceitando convite...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aceitar Convite
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Para aceitar o convite, crie uma conta ou faça login com o email{' '}
                <strong>{inviteEmail}</strong>
              </p>
              <div className="flex flex-col gap-2">
                <Button asChild>
                  <Link to={`/registro?invite=${token}`}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Criar Conta
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to={`/login?invite=${token}`}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Já tenho uma conta
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
