import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAcceptInvitation } from '@/hooks/useInvitations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Register() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  
  const [fullName, setFullName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inviteData, setInviteData] = useState<{ tenantName: string; inviteEmail: string } | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(!!inviteToken);
  
  const { signUp } = useAuth();
  const { validateToken, acceptInvitation } = useAcceptInvitation();
  const navigate = useNavigate();

  // Validar convite se token presente
  useEffect(() => {
    const checkInvite = async () => {
      if (!inviteToken) return;
      
      setIsLoadingInvite(true);
      const result = await validateToken(inviteToken);
      
      if (result.valid && result.invitation) {
        setInviteData({
          tenantName: result.tenantName || 'Organização',
          inviteEmail: result.invitation.email,
        });
        setEmail(result.invitation.email);
      }
      setIsLoadingInvite(false);
    };
    
    checkInvite();
  }, [inviteToken, validateToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      // Se é um convite, criar conta sem tenant e depois aceitar convite
      if (inviteToken && inviteData) {
        // 1. Criar conta básica
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Falha ao criar usuário');

        const userId = authData.user.id;

        // 2. Criar profile básico (sem tenant_id ainda)
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: fullName,
          });

        if (profileError) throw profileError;

        // 3. Aceitar o convite (isso vai vincular ao tenant e criar role)
        acceptInvitation(
          { token: inviteToken, userId },
          {
            onSuccess: () => {
              toast.success('Conta criada com sucesso!', {
                description: `Você agora faz parte de ${inviteData.tenantName}.`,
              });
              navigate('/dashboard');
            },
            onError: (error) => {
              toast.error('Erro ao aceitar convite', {
                description: error.message,
              });
              setIsLoading(false);
            },
          }
        );
        return;
      }

      // Fluxo normal: criar conta com novo tenant
      const { error } = await signUp(email, password, fullName, tenantName);

      if (error) {
        toast.error('Erro ao criar conta', {
          description: error.message,
        });
        setIsLoading(false);
        return;
      }

      toast.success('Conta criada com sucesso!', {
        description: 'Você já pode começar a usar a plataforma.',
      });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error('Erro ao criar conta', {
        description: error.message,
      });
      setIsLoading(false);
    }
  };

  if (isLoadingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Carregando convite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <CardTitle className="text-2xl">Criar sua conta</CardTitle>
          <CardDescription>
            {inviteData
              ? `Você foi convidado para ${inviteData.tenantName}`
              : 'Comece a organizar o marketing da sua agência'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {!inviteData && (
              <div className="space-y-2">
                <Label htmlFor="tenantName">Nome da Agência</Label>
                <Input
                  id="tenantName"
                  type="text"
                  placeholder="Minha Agência"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName">Seu Nome</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="João Silva"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || !!inviteData}
              />
              {inviteData && (
                <p className="text-xs text-muted-foreground">
                  O email está vinculado ao convite e não pode ser alterado
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar Conta'
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{' '}
              <Link 
                to={inviteToken ? `/login?invite=${inviteToken}` : '/login'} 
                className="font-medium text-primary hover:underline"
              >
                Fazer login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
