import { useAuth } from '@/contexts/AuthContext';
import { TeamList } from '@/components/settings/TeamList';
import { InviteDialog } from '@/components/settings/InviteDialog';
import { PendingInvites } from '@/components/settings/PendingInvites';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building2, Settings2 } from 'lucide-react';

export default function Settings() {
  const { tenant, userRole } = useAuth();
  const isOwner = userRole?.role === 'owner';

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

      <Tabs defaultValue="team" className="space-y-6">
        <TabsList>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="h-4 w-4" />
            Organização
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-6">
          {isOwner && <PendingInvites />}
          <TeamList />
        </TabsContent>

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
      </Tabs>
    </div>
  );
}
