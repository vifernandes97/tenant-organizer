import { ReactNode, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Lightbulb,
  Settings,
  LogOut,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import logoApproveeDark from '@/assets/logo-approvee-dark.png';

interface AppLayoutProps {
  children: ReactNode;
}

function AppSidebar() {
  const { user, profile, signOut } = useAuth();
  const { userRole } = useAuth();
  const isOwner = userRole?.role === 'owner';
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const [isHovering, setIsHovering] = useState(false);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isRealCollapsed = state === 'collapsed';
  const showLabels = !isRealCollapsed || isHovering;
  const isCollapsed = !showLabels;

  const handleMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (isRealCollapsed) setIsHovering(true);
  };

  const handleMouseLeave = () => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => setIsHovering(false), 150);
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(isOwner ? [{ href: '/clientes', label: 'Clientes', icon: Users }] : []),
    { href: '/cronogramas', label: 'Cronogramas', icon: CalendarDays },
    { href: '/brainstorm', label: 'Brainstorm', icon: Lightbulb },
    { href: '/configuracoes', label: 'Configurações', icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // When real state is collapsed and hovering, expand only the fixed inner panel
  // (not the gap div) so the main content doesn't shift.
  const hoverExpandClass =
    isRealCollapsed && isHovering
      ? '[&_[data-sidebar=sidebar]]:!w-[--sidebar-width] [&>div:first-child>div]:!w-[--sidebar-width] [&>div:first-child]:shadow-lg [&>div:first-child]:transition-[width] [&>div:first-child]:duration-200'
      : '';

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className={hoverExpandClass}>
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-12 items-center px-2">
          {isCollapsed ? (
            <img src={logoApproveeDark} alt="Approvee" className="h-6 w-6 object-contain" />
          ) : (
            <img src={logoApproveeDark} alt="Approvee" className="h-8" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link to={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 px-2 h-auto py-2"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 overflow-hidden text-left">
                  <p className="truncate text-sm font-medium">
                    {profile?.full_name || 'Usuário'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" side="top">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function AppHeader() {
  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/clientes', label: 'Clientes' },
    { href: '/cronogramas', label: 'Cronogramas' },
    { href: '/brainstorm', label: 'Brainstorm' },
    { href: '/configuracoes', label: 'Configurações' },
  ];
  const location = useLocation();

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
      <SidebarTrigger />
      <h1 className="text-lg font-semibold text-foreground">
        {navItems.find((item) => location.pathname.startsWith(item.href))?.label || 'Dashboard'}
      </h1>
    </header>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
