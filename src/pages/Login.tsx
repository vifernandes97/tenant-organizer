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

export default function Login() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inviteData, setInviteData] = useState<{ tenantName: string } | null>(null);
  
  const { signIn, user } = useAuth();
  const { validateToken, acceptInvitation } = useAcceptInvitation();
  const navigate = useNavigate();

  // Validar convite se token presente
  useEffect(() => {
    const checkInvite = async () => {
      if (!inviteToken) return;
      
      const result = await validateToken(inviteToken);
      
      if (result.valid && result.tenantName) {
        setInviteData({ tenantName: result.tenantName });
      }
    };
    
    checkInvite();
  }, [inviteToken, validateToken]);

  // Se usuário já está logado e tem convite, aceitar automaticamente
  useEffect(() => {
    const handleLoggedInWithInvite = async () => {
      if (user && inviteToken) {
        setIsLoading(true);
        acceptInvitation(
          { token: inviteToken, userId: user.id },
          {
            onSuccess: () => {
              toast.success('Convite aceito com sucesso!');
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
      }
    };
    
    handleLoggedInWithInvite();
  }, [user, inviteToken, acceptInvitation, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error('Erro ao fazer login', {
        description: error.message === 'Invalid login credentials'
          ? 'Email ou senha incorretos'
          : error.message,
      });
      setIsLoading(false);
      return;
    }

    // Se tem convite, o useEffect acima vai cuidar de aceitar
    if (!inviteToken) {
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Left side - Features */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 xl:p-16">
        <div className="max-w-lg">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Sparkles className="h-7 w-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">Marketing Hub</span>
          </div>
          
          <h1 className="text-3xl xl:text-4xl font-bold text-foreground mb-4">
            Gerencie o conteúdo de todos os seus clientes em um só lugar
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8">
            A plataforma completa para agências de marketing organizarem, planejarem e aprovarem postagens de redes sociais com seus clientes.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Calendário Visual</h3>
                <p className="text-sm text-muted-foreground">Visualize e organize todas as postagens em um calendário intuitivo com visões mensal e semanal.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Comentários em Imagens</h3>
                <p className="text-sm text-muted-foreground">Adicione feedbacks diretamente nas imagens, estilo Figma, para aprovações precisas.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197v1" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Gestão Multi-cliente</h3>
                <p className="text-sm text-muted-foreground">Gerencie múltiplos clientes com isolamento total de dados e permissões por usuário.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Fluxo de Aprovação</h3>
                <p className="text-sm text-muted-foreground">Do rascunho à publicação: controle cada etapa com status claros e notificações.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Login form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-4">
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">Marketing Hub</span>
        </div>

        <Card className="w-full max-w-md animate-fade-in">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Bem-vindo de volta!</CardTitle>
            <CardDescription>
              {inviteData
                ? `Faça login para aceitar o convite de ${inviteData.tenantName}`
                : 'Entre com suas credenciais para acessar sua conta'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
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
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {inviteToken ? 'Entrando e aceitando convite...' : 'Entrando...'}
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Não tem uma conta?{' '}
                <Link 
                  to={inviteToken ? `/registro?invite=${inviteToken}` : '/registro'} 
                  className="font-medium text-primary hover:underline"
                >
                  Criar conta
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
