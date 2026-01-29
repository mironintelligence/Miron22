import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function RequireAuth() {
  const { status } = useAuth();
  if (status === "loading") return null; // istersen spinner
  if (status !== "authed") return <Navigate to="/" replace />;
  return <Outlet />;
}