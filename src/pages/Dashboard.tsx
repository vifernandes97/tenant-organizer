import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CalendarDays, FileText, TrendingUp, Plus, ArrowRight } from 'lucide-react';

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalPosts: number;
  scheduledPosts: number;
}

export default function Dashboard() {
  const { profile, tenant } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    totalPosts: 0,
    scheduledPosts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile?.tenant_id) return;

      try {
        // Fetch clients count
        const { count: totalClients } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true });

        const { count: activeClients } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        // Fetch posts count
        const { count: totalPosts } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true });

        const { count: scheduledPosts } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'scheduled');

        setStats({
          totalClients: totalClients || 0,
          activeClients: activeClients || 0,
          totalPosts: totalPosts || 0,
          scheduledPosts: scheduledPosts || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [profile?.tenant_id]);

  const statCards = [
    {
      title: 'Total de Clientes',
      value: stats.totalClients,
      description: `${stats.activeClients} ativos`,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Postagens',
      value: stats.totalPosts,
      description: `${stats.scheduledPosts} agendadas`,
      icon: FileText,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Este Mês',
      value: stats.scheduledPosts,
      description: 'Posts agendados',
      icon: CalendarDays,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Taxa de Publicação',
      value: stats.totalPosts > 0 
        ? Math.round(((stats.totalPosts - stats.scheduledPosts) / stats.totalPosts) * 100) 
        : 0,
      description: '% publicados',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Olá, {profile?.full_name?.split(' ')[0]}! 👋
          </h2>
          <p className="text-muted-foreground">
            Bem-vindo ao painel da {tenant?.name}
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link to="/clientes">
              <Users className="mr-2 h-4 w-4" />
              Ver Clientes
            </Link>
          </Button>
          <Button asChild>
            <Link to="/cronogramas">
              <Plus className="mr-2 h-4 w-4" />
              Nova Postagem
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="animate-scale-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? '...' : stat.value}
                {stat.title === 'Taxa de Publicação' && !isLoading && '%'}
              </div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acesso Rápido</CardTitle>
            <CardDescription>
              Atalhos para as principais funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="ghost" className="justify-between" asChild>
              <Link to="/clientes">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Gerenciar Clientes
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" className="justify-between" asChild>
              <Link to="/cronogramas">
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Ver Cronogramas
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dica</CardTitle>
            <CardDescription>
              Como começar a usar a plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-secondary/50 p-4">
              <p className="text-sm text-muted-foreground">
                1. Cadastre seus <strong>clientes</strong> com todas as informações importantes<br />
                2. Acesse o <strong>cronograma</strong> para agendar postagens<br />
                3. Acompanhe o status de cada postagem no calendário
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
