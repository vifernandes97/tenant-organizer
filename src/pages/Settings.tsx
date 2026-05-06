import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { TeamList } from '@/components/settings/TeamList';
import { InviteDialog } from '@/components/settings/InviteDialog';
import { PendingInvites } from '@/components/settings/PendingInvites';
import { ChannelStatusManager } from '@/components/settings/ChannelStatusManager';
import { ApiTokensManager } from '@/components/settings/ApiTokensManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building2, Settings2, Tag, Plug } from 'lucide-react';

export default function Settings() {
  const { tenant, userRole } = useAuth();
  const isOwner = userRole?.role === 'owner';
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (() => {
    const requested = searchParams.get('tab');
    if (requested === 'statuses' && isOwner) return 'statuses';
    if (requested === 'integrations' && isOwner) return 'integrations';
    if (requested === 'team' && isOwner) return 'team';
    if (requested === 'organization') return 'organization';
    return isOwner ? 'team' : 'organization';
  })();

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (searchParams.get('tab') !== activeTab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', activeTab);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie sua organização e equipe
          </p>
        </div>
        {isOwner && <InviteDialog />}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          {isOwner && (
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Equipe
            </TabsTrigger>
          )}
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="h-4 w-4" />
            Organização
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="statuses" className="gap-2">
              <Tag className="h-4 w-4" />
              Status de Posts
            </TabsTrigger>
          )}
          {isOwner && (
            <TabsTrigger value="integrations" className="gap-2">
              <Plug className="h-4 w-4" />
              API & MCP
            </TabsTrigger>
          )}
        </TabsList>

        {isOwner && (
          <TabsContent value="team" className="space-y-6">
            <PendingInvites />
            <TeamList />
          </TabsContent>
        )}

        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Organização</CardTitle>
              <CardDescription>Dados da sua agência</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Nome da Organização
                </label>
                <p className="text-lg font-medium">{tenant?.name || 'Não definido'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Identificador (slug)
                </label>
                <p className="text-sm font-mono text-muted-foreground">
                  {tenant?.slug || 'Não definido'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Configurações Avançadas
              </CardTitle>
              <CardDescription>
                Opções adicionais de configuração
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Em breve mais configurações estarão disponíveis aqui.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {isOwner && (
          <TabsContent value="statuses" className="space-y-6">
            <ChannelStatusManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
