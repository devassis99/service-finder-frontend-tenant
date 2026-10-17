import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "@/auth/auth-store";
import { LoadingScreen } from "@/components/layout/LoadingScreen";

/**
 * Gates everything that needs a session. "unknown" only lasts the tick
 * zustand/persist takes to rehydrate from storage.
 *
 * Signed out, it sends the visitor to /login, remembering where they
 * were going so signing in lands them back there.
 */
export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === "unknown") return <LoadingScreen />;
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/**
 * The opposite gate, for sign-in and sign-up: someone already signed in
 * has no business on those screens and goes straight home.
 */
export function GuestRoute() {
  const status = useAuthStore((s) => s.status);

  if (status === "unknown") return <LoadingScreen />;
  if (status === "authenticated") return <Navigate to="/home" replace />;
  return <Outlet />;
}

export default ProtectedRoute;
