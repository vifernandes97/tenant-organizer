import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions, type Feature, type Action } from '@/hooks/usePermissions';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOwner?: boolean;
  requirePermission?: { feature: Feature; action: Action };
}

export function ProtectedRoute({ children, requireOwner = false, requirePermission }: ProtectedRouteProps) {
  const { user, isLoading, profile, profileNotFound, userRole } = useAuth();
  const { can, isLoading: permsLoading } = usePermissions();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profileNotFound) {
    return <Navigate to="/setup" state={{ from: location }} replace />;
  }

  if (!profile && !profileNotFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (requireOwner && userRole?.role !== 'owner') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requirePermission) {
    if (permsLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    if (!can(requirePermission.feature, requirePermission.action)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
