import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import FullScreenSpinner from "../layout/FullScreenSpinner";

// Wrap any route element that requires a signed-in employee. Pass
// ownerOnly to also gate on role. Pass requiredPermission to gate on the
// granular Security Roles system instead — owner/super_user always pass,
// staff need the exact key granted.
export default function ProtectedRoute({ children, ownerOnly = false, requiredPermission = null }) {
  const { admin, status, hasPermission } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullScreenSpinner />;

  if (status === "guest") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (ownerOnly && admin?.role !== "owner" && admin?.role !== "super_user") {
    return <Navigate to="/" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
