import { useState } from 'react';
import { useApiTokens } from '@/hooks/useApiTokens';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Copy, Check, KeyRound, Trash2, AlertCircle, Plug, Lock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePlan } from '@/hooks/usePlan';
import { Link } from 'react-router-dom';

const MCP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp-brainstorm`;

export function ApiTokensManager() {
  const { tokens, isLoading, createToken, revokeToken, deleteToken } = useApiTokens();
  const { hasFeature, plan } = usePlan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!hasFeature('api_access')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            API & MCP indisponível no plano {plan?.name ?? 'atual'}
          </CardTitle>
          <CardDescription>
            Tokens de API e integração com Claude (MCP) estão disponíveis nos planos Agência e Pro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/configuracoes?tab=billing">
              <Sparkles className="h-4 w-4 mr-2" />
              Ver planos
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Informe um nome para o token');
      return;
    }
    const result = await createToken.mutateAsync(name.trim());
    setCreatedToken(result.token);
    setName('');
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 1500);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setCreatedToken(null);
    setName('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Conectar ao Claude (MCP)
          </CardTitle>
          <CardDescription>
            Use o Claude Desktop para enviar várias ideias de uma vez para o Brainstorm.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">URL do servidor MCP</Label>
            <div className="flex gap-2 mt-1">
              <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                {MCP_URL}
              </code>
              <Button variant="outline" size="icon" onClick={() => handleCopy(MCP_URL)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              1. Gere um token abaixo e copie. <br />
              2. No Claude Desktop, adicione um conector MCP do tipo <strong>HTTP</strong> apontando
              para a URL acima, com header <code>Authorization: Bearer SEU_TOKEN</code>.
              <br />
              3. Peça ao Claude algo como: <em>"Envie estas ideias para o Marketing Hub:..."</em> —
              ele usará a ferramenta <code>create_brainstorm_ideas</code>.
            </p>
            <p>
              Cada ideia vira um registro em <strong>Brainstorm</strong> com o tema no título e o
              restante na descrição.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Tokens de API
            </CardTitle>
            <CardDescription>
              Gere tokens para autenticar integrações externas com sua organização.
            </CardDescription>
          </div>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              if (!open) closeDialog();
              else setDialogOpen(true);
            }}
          >
            <DialogTrigger asChild>
              <Button>Gerar novo token</Button>
            </DialogTrigger>
            <DialogContent>
              {!createdToken ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Novo token de API</DialogTitle>
                    <DialogDescription>
                      Dê um nome para identificar onde esse token será usado.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="token-name">Nome</Label>
                    <Input
                      id="token-name"
                      placeholder="Ex: Claude Desktop"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={80}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={closeDialog}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreate} disabled={createToken.isPending}>
                      {createToken.isPending ? 'Gerando...' : 'Gerar token'}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Token criado</DialogTitle>
                    <DialogDescription>
                      Copie agora — por segurança, não será possível visualizá-lo novamente.
                    </DialogDescription>
                  </DialogHeader>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Guarde com cuidado</AlertTitle>
                    <AlertDescription>
                      Esse token dá acesso de criação de ideias na sua organização.
                    </AlertDescription>
                  </Alert>
                  <div className="flex gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                      {createdToken}
                    </code>
                    <Button variant="outline" size="icon" onClick={() => handleCopy(createdToken)}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button onClick={closeDialog}>Pronto</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum token criado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead>Último uso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {t.token_prefix}…
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.last_used_at
                        ? formatDistanceToNow(new Date(t.last_used_at), { addSuffix: true, locale: ptBR })
                        : 'Nunca'}
                    </TableCell>
                    <TableCell>
                      {t.revoked_at ? (
                        <span className="text-xs text-destructive">Revogado</span>
                      ) : (
                        <span className="text-xs text-primary">Ativo</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!t.revoked_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeToken.mutate(t.id)}
                        >
                          Revogar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Remover este token permanentemente?')) {
                            deleteToken.mutate(t.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
