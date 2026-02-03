import { Navigate } from "react-router-dom";
import { getRole, isLoggedIn } from "./auth.store";

export default function RequireAdmin(props: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (getRole() !== "ADMIN") return <Navigate to="/products" replace />;
  return <>{props.children}</>;
}
