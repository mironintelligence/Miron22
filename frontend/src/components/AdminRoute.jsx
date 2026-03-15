import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function AdminRoute({ children }) {
  const { status, user } = useAuth();
  if (status === "loading") return null;
  if (status !== "authed") return <Navigate to="/" replace />;
  return user?.role === "admin" ? children : <Navigate to="/home" replace />;
}

