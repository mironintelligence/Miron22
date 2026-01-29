import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function PublicOnly() {
  const { status } = useAuth();
  if (status === "loading") return null;
  if (status === "authed") return <Navigate to="/home" replace />;
  return <Outlet />;
}