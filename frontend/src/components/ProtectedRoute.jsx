import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function ProtectedRoute({ children }) {
  const { status } = useAuth();
  if (status === "loading") return null;
  return status === "authed" ? children : <Navigate to="/" replace />;
}
