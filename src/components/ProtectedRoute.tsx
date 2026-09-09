import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Kontrollerer din ReliefRead-profil...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const returnPath = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(returnPath)}`} replace />;
  }

  return <>{children}</>;
}
