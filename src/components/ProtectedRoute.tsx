import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<"admin" | "servant" | "parent" | "child">;
}

/**
 * Route guard that prevents flash of restricted UI.
 * Renders a loading skeleton while auth state is resolving,
 * redirects to /auth if not authenticated, and redirects
 * to /dashboard if the user's role is not in allowedRoles.
 * 
 * Data security is still enforced by Supabase RLS — this is
 * a defense-in-depth UX improvement.
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  // If allowedRoles specified but userRole is still null (no role assigned), redirect
  if (allowedRoles && !userRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
