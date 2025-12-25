import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types/database';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  minRole?: AppRole;
}

const roleHierarchy: AppRole[] = ['viewer', 'editor', 'admin', 'owner'];

export function ProtectedRoute({ children, minRole }: ProtectedRouteProps) {
  const { user, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (minRole && role) {
    const currentIndex = roleHierarchy.indexOf(role);
    const requiredIndex = roleHierarchy.indexOf(minRole);
    if (currentIndex < requiredIndex) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

